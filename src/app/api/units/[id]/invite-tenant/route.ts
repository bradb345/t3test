import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { units, tenantInvitations, tenantOnboardingProgress, properties, user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "~/lib/email";
import { getTenantInvitationEmailHtml } from "~/emails/tenant-invitation";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const unitId = parseInt(params.id);
    
    if (isNaN(unitId)) {
      return NextResponse.json(
        { error: "Invalid unit ID" },
        { status: 400 }
      );
    }

    // Verify the unit exists and belongs to the landlord
    const [unit] = await db
      .select({
        id: units.id,
        unitNumber: units.unitNumber,
        propertyId: units.propertyId,
        propertyUserId: properties.userId,
        propertyAddress: properties.address,
      })
      .from(units)
      .leftJoin(properties, eq(units.propertyId, properties.id))
      .where(eq(units.id, unitId))
      .limit(1);

    if (!unit) {
      return NextResponse.json(
        { error: "Unit not found" },
        { status: 404 }
      );
    }

    // Verify the user owns this property
    if (unit.propertyUserId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - you don't own this property" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = (await request.json()) as { tenantName: string; tenantEmail: string; isExistingTenant?: boolean };
    const { tenantName, tenantEmail, isExistingTenant = false } = body;

    if (!tenantName || !tenantEmail) {
      return NextResponse.json(
        { error: "Tenant name and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tenantEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get landlord info
    const [landlordUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, userId))
      .limit(1);

    if (!landlordUser) {
      return NextResponse.json(
        { error: "Landlord user not found" },
        { status: 404 }
      );
    }

    // Generate unique invitation token
    const invitationToken = crypto.randomBytes(32).toString("hex");

    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create invitation record
    const [invitation] = await db
      .insert(tenantInvitations)
      .values({
        unitId,
        landlordId: landlordUser.id,
        tenantEmail,
        tenantName,
        invitationToken,
        isExistingTenant,
        status: "sent",
        expiresAt,
      })
      .returning();

    if (!invitation) {
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    // Create initial onboarding progress record
    await db.insert(tenantOnboardingProgress).values({
      invitationId: invitation.id,
      currentStep: 1,
      completedSteps: JSON.stringify([]),
      status: "not_started",
      data: JSON.stringify({}),
    });

    // Generate onboarding URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const onboardingUrl = `${baseUrl}/onboarding?token=${invitationToken}`;

    // Prepare email content
    const landlordName = `${landlordUser.first_name} ${landlordUser.last_name}`;
    const unitAddress = unit.propertyAddress ?? "Unknown Address";
    const unitNumber = unit.unitNumber;

    const emailHtml = getTenantInvitationEmailHtml({
      tenantName,
      landlordName,
      unitAddress,
      unitNumber,
      onboardingUrl,
      expiresAt,
    });

    // Send invitation email
    await sendEmail({
      to: tenantEmail,
      subject: `Welcome to Your New Home at ${unitNumber}!`,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        tenantEmail: invitation.tenantEmail,
        tenantName: invitation.tenantName,
        status: invitation.status,
        sentAt: invitation.sentAt,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error creating tenant invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
