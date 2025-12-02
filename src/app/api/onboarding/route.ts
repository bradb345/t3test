import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { tenantInvitations, tenantOnboardingProgress, units, properties, user, notifications, leases } from "~/server/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { sendEmail } from "~/lib/email";
import { getOnboardingCompleteEmailHtml, getOnboardingCompleteEmailSubject } from "~/emails/onboarding-complete";
import { encryptSSN } from "~/lib/encryption";

// GET /api/onboarding?token=xxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Find the invitation
    const [invitation] = await db
      .select()
      .from(tenantInvitations)
      .where(eq(tenantInvitations.invitationToken, token))
      .limit(1);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    // Check if already accepted
    if (invitation.status === "accepted" && invitation.acceptedAt) {
      return NextResponse.json(
        { error: "Invitation has already been accepted" },
        { status: 409 }
      );
    }

    // Get onboarding progress
    const [progress] = await db
      .select()
      .from(tenantOnboardingProgress)
      .where(eq(tenantOnboardingProgress.invitationId, invitation.id))
      .limit(1);

    if (!progress) {
      return NextResponse.json(
        { error: "Onboarding progress not found" },
        { status: 404 }
      );
    }

    // Parse stored data
    const completedSteps = progress.completedSteps 
      ? (JSON.parse(progress.completedSteps) as string[])
      : [];
    const data = progress.data 
      ? (JSON.parse(progress.data) as Record<string, unknown>)
      : {};

    // Return masked SSN for security (only last 4 digits)
    // Never return the encrypted or decrypted full SSN to the client
    if (data.personal && typeof data.personal === 'object') {
      const personal = data.personal as Record<string, unknown>;
      if (personal.ssnLast4 && typeof personal.ssnLast4 === 'string') {
        // Replace with masked version using last 4 digits
        personal.ssn = `***-**-${personal.ssnLast4}`;
        // Remove encrypted data from response
        delete personal.ssnEncrypted;
        delete personal.ssnLast4;
      }
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        unitId: invitation.unitId,
        tenantEmail: invitation.tenantEmail,
        tenantName: invitation.tenantName,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
      progress: {
        id: progress.id,
        currentStep: progress.currentStep,
        completedSteps,
        status: progress.status,
        data,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching onboarding data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/onboarding?token=xxx
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Find the invitation
    const [invitation] = await db
      .select()
      .from(tenantInvitations)
      .where(
        and(
          eq(tenantInvitations.invitationToken, token),
          gt(tenantInvitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation token" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = (await request.json()) as {
      step?: number;
      stepData?: Record<string, unknown>;
      completedStep?: string;
      status?: string;
    };

    // Get current progress
    const [currentProgress] = await db
      .select()
      .from(tenantOnboardingProgress)
      .where(eq(tenantOnboardingProgress.invitationId, invitation.id))
      .limit(1);

    if (!currentProgress) {
      return NextResponse.json(
        { error: "Onboarding progress not found" },
        { status: 404 }
      );
    }

    // Parse existing data
    const existingData = currentProgress.data
      ? (JSON.parse(currentProgress.data) as Record<string, unknown>)
      : {};
    const existingCompletedSteps = currentProgress.completedSteps
      ? (JSON.parse(currentProgress.completedSteps) as string[])
      : [];

    // Encrypt SSN if present in personal info before storing
    let processedStepData = body.stepData;
    if (body.stepData?.personal && typeof body.stepData.personal === 'object') {
      const personal = body.stepData.personal as Record<string, unknown>;
      if (personal.ssn && typeof personal.ssn === 'string') {
        // Validate and clean SSN
        const cleanSSN = personal.ssn.replace(/[^0-9]/g, '');
        
        // Validate SSN has exactly 9 digits
        if (cleanSSN.length !== 9) {
          return NextResponse.json(
            { error: "Invalid SSN format. SSN must contain exactly 9 digits." },
            { status: 400 }
          );
        }
        
        // Encrypt SSN and store encrypted version
        const encryptedSSN = encryptSSN(personal.ssn);
        const last4 = cleanSSN.slice(-4);
        
        processedStepData = {
          ...body.stepData,
          personal: {
            ...personal,
            ssnEncrypted: encryptedSSN,
            ssnLast4: last4,
            ssn: undefined, // Remove plaintext SSN
          },
        };
      }
    }

    // Merge new step data with existing data
    const updatedData = {
      ...existingData,
      ...(processedStepData ?? {}),
    };

    // Add completed step if provided
    let updatedCompletedSteps = existingCompletedSteps;
    if (body.completedStep && !existingCompletedSteps.includes(body.completedStep)) {
      updatedCompletedSteps = [...existingCompletedSteps, body.completedStep];
    }

    // Determine new status
    let newStatus = body.status ?? currentProgress.status;
    let completedAt = currentProgress.completedAt;
    let startedAt = currentProgress.startedAt;

    // Set startedAt if this is the first update
    if (!startedAt && currentProgress.status === "not_started") {
      startedAt = new Date();
      newStatus = "in_progress";
    }

    // Set completedAt if status is completed
    if (newStatus === "completed" && !completedAt) {
      completedAt = new Date();
    }

    // Update progress
    const [updatedProgress] = await db
      .update(tenantOnboardingProgress)
      .set({
        currentStep: body.step ?? currentProgress.currentStep,
        completedSteps: JSON.stringify(updatedCompletedSteps),
        status: newStatus,
        data: JSON.stringify(updatedData),
        startedAt,
        completedAt,
        updatedAt: new Date(),
      })
      .where(eq(tenantOnboardingProgress.id, currentProgress.id))
      .returning();

    if (!updatedProgress) {
      return NextResponse.json(
        { error: "Failed to update onboarding progress" },
        { status: 404 }
      );
    }

    // Prepare response data with masked SSN
    const responseData = { ...updatedData };
    if (responseData.personal && typeof responseData.personal === 'object') {
      const personal = responseData.personal as Record<string, unknown>;
      if (personal.ssnLast4 && typeof personal.ssnLast4 === 'string') {
        // Replace with masked version using last 4 digits
        personal.ssn = `***-**-${personal.ssnLast4}`;
        // Remove encrypted data from response
        delete personal.ssnEncrypted;
        delete personal.ssnLast4;
      }
    }

    return NextResponse.json({
      success: true,
      progress: {
        id: updatedProgress.id,
        currentStep: updatedProgress.currentStep,
        completedSteps: updatedCompletedSteps,
        status: updatedProgress.status,
        data: responseData,
      },
    });
  } catch (error) {
    console.error("Error updating onboarding progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/onboarding?token=xxx - Complete onboarding and notify landlord
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Parse request body for clerkUserId
    const body = (await request.json()) as {
      clerkUserId?: string;
    };

    // Find the invitation with related data
    const [invitation] = await db
      .select({
        invitation: tenantInvitations,
        unit: units,
        property: properties,
        landlord: user,
      })
      .from(tenantInvitations)
      .innerJoin(units, eq(units.id, tenantInvitations.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .innerJoin(user, eq(user.id, tenantInvitations.landlordId))
      .where(
        and(
          eq(tenantInvitations.invitationToken, token),
          gt(tenantInvitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation token" },
        { status: 404 }
      );
    }

    // Get current progress
    const [currentProgress] = await db
      .select()
      .from(tenantOnboardingProgress)
      .where(eq(tenantOnboardingProgress.invitationId, invitation.invitation.id))
      .limit(1);

    if (!currentProgress) {
      return NextResponse.json(
        { error: "Onboarding progress not found" },
        { status: 404 }
      );
    }

    // Find the tenant user by Clerk ID if provided
    let tenantUser = null;
    if (body.clerkUserId) {
      const [foundUser] = await db
        .select()
        .from(user)
        .where(eq(user.auth_id, body.clerkUserId))
        .limit(1);
      tenantUser = foundUser ?? null;
    }

    // If this is an existing tenant, create a lease and attach them to the unit
    if (invitation.invitation.isExistingTenant && tenantUser) {
      // Create a lease for the existing tenant
      // Default to a 1-year lease starting today
      const leaseStart = new Date();
      const leaseEnd = new Date();
      leaseEnd.setFullYear(leaseEnd.getFullYear() + 1);

      await db.insert(leases).values({
        unitId: invitation.unit.id,
        tenantId: tenantUser.id,
        landlordId: invitation.landlord.id,
        leaseStart,
        leaseEnd,
        monthlyRent: invitation.unit.monthlyRent ?? "0",
        securityDeposit: invitation.unit.deposit,
        status: "active",
      });

      // Mark the unit as unavailable
      await db
        .update(units)
        .set({
          isAvailable: false,
          updatedAt: new Date(),
        })
        .where(eq(units.id, invitation.unit.id));

      // Update the invitation with the tenant user ID
      await db
        .update(tenantInvitations)
        .set({
          tenantUserId: tenantUser.id,
          updatedAt: new Date(),
        })
        .where(eq(tenantInvitations.id, invitation.invitation.id));

      // Update onboarding progress with tenant user ID
      await db
        .update(tenantOnboardingProgress)
        .set({
          tenantUserId: tenantUser.id,
          updatedAt: new Date(),
        })
        .where(eq(tenantOnboardingProgress.id, currentProgress.id));
    }

    // Update progress to completed
    await db
      .update(tenantOnboardingProgress)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenantOnboardingProgress.id, currentProgress.id));

    // Update invitation status to accepted
    await db
      .update(tenantInvitations)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenantInvitations.id, invitation.invitation.id));

    // Create in-app notification for landlord
    const notificationMessage = invitation.invitation.isExistingTenant && tenantUser
      ? `${invitation.invitation.tenantName} has completed their onboarding and has been attached to Unit ${invitation.unit.unitNumber}`
      : `${invitation.invitation.tenantName} has completed their onboarding for Unit ${invitation.unit.unitNumber}`;

    await db.insert(notifications).values({
      userId: invitation.landlord.id,
      type: "onboarding_complete",
      title: "Tenant Onboarding Complete",
      message: notificationMessage,
      data: JSON.stringify({
        tenantName: invitation.invitation.tenantName,
        tenantEmail: invitation.invitation.tenantEmail,
        unitId: invitation.unit.id,
        unitNumber: invitation.unit.unitNumber,
        propertyId: invitation.property.id,
        invitationId: invitation.invitation.id,
        isExistingTenant: invitation.invitation.isExistingTenant,
        tenantAttached: invitation.invitation.isExistingTenant && !!tenantUser,
      }),
      actionUrl: `/my-properties/${invitation.property.id}`,
    });

    // Send email notification to landlord
    const landlordEmail = invitation.landlord.email;
    const landlordName = invitation.landlord.first_name ?? "Landlord";
    
    if (landlordEmail) {
      const emailHtml = getOnboardingCompleteEmailHtml({
        landlordName,
        tenantName: invitation.invitation.tenantName,
        tenantEmail: invitation.invitation.tenantEmail,
        unitAddress: invitation.property.address,
        unitNumber: invitation.unit.unitNumber,
        isExistingTenant: invitation.invitation.isExistingTenant,
        tenantAttached: invitation.invitation.isExistingTenant && !!tenantUser,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/my-properties/${invitation.property.id}`,
      });

      await sendEmail({
        to: landlordEmail,
        subject: getOnboardingCompleteEmailSubject(invitation.invitation.tenantName),
        html: emailHtml,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
      tenantAttached: invitation.invitation.isExistingTenant && !!tenantUser,
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
