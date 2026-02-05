import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import {
  tenancyApplications,
  units,
  properties,
  user,
} from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { getPostHogClient } from "~/lib/posthog-server";

// POST: Submit a tenancy application
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const unitId = parseInt(params.id);
    if (isNaN(unitId)) {
      return NextResponse.json({ error: "Invalid unit ID" }, { status: 400 });
    }

    // Get current user's DB record
    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the unit with property info
    const [unitData] = await db
      .select({
        unit: units,
        property: properties,
      })
      .from(units)
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(eq(units.id, unitId))
      .limit(1);

    if (!unitData) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    // Check if unit is visible/available
    if (!unitData.unit.isVisible) {
      return NextResponse.json(
        { error: "This unit is not accepting applications" },
        { status: 400 }
      );
    }

    // Check if user is the property owner
    if (unitData.property.userId === clerkUserId) {
      return NextResponse.json(
        { error: "You cannot apply for your own property" },
        { status: 400 }
      );
    }

    // Check if user already has a pending application for this unit
    const [existingApplication] = await db
      .select()
      .from(tenancyApplications)
      .where(
        and(
          eq(tenancyApplications.unitId, unitId),
          eq(tenancyApplications.applicantUserId, currentUser.id),
          eq(tenancyApplications.status, "pending")
        )
      )
      .limit(1);

    if (existingApplication) {
      return NextResponse.json(
        { error: "You already have a pending application for this unit" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      applicationData: Record<string, unknown>;
    };

    if (!body.applicationData) {
      return NextResponse.json(
        { error: "Application data is required" },
        { status: 400 }
      );
    }

    // Create the application
    const [newApplication] = await db
      .insert(tenancyApplications)
      .values({
        unitId,
        applicantUserId: currentUser.id,
        status: "pending",
        applicationData: JSON.stringify(body.applicationData),
        paymentSetupComplete: false,
        submittedAt: new Date(),
      })
      .returning();

    // Find the landlord and send notification
    const [landlord] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, unitData.property.userId))
      .limit(1);

    if (landlord) {
      await createAndEmitNotification({
        userId: landlord.id,
        type: "new_application",
        title: "New Tenancy Application",
        message: `${currentUser.first_name} ${currentUser.last_name} has submitted an application for Unit ${unitData.unit.unitNumber} at ${unitData.property.name}`,
        data: JSON.stringify({
          applicationId: newApplication?.id,
          unitId,
          propertyId: unitData.property.id,
          applicantName: `${currentUser.first_name} ${currentUser.last_name}`,
          applicantEmail: currentUser.email,
        }),
        actionUrl: `/my-properties?tab=applications`,
      });
    }

    // Track tenancy application submission in PostHog
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: clerkUserId,
      event: "tenancy_application_submitted",
      properties: {
        application_id: newApplication?.id,
        unit_id: unitId,
        property_id: unitData.property.id,
        monthly_rent: unitData.unit.monthlyRent,
        currency: unitData.unit.currency,
        source: "api",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Application submitted successfully",
        applicationId: newApplication?.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating tenancy application:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
