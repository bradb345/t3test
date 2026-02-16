import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import {
  tenancyApplications,
  units,
  properties,
  user,
  tenantInvitations,
} from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { randomBytes } from "crypto";
import { trackServerEvent } from "~/lib/posthog-events/server";

// GET: Get a single application with full details
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applicationId = parseInt(params.id);
    if (isNaN(applicationId)) {
      return NextResponse.json(
        { error: "Invalid application ID" },
        { status: 400 }
      );
    }

    // Get application with related data
    const [applicationData] = await db
      .select({
        application: tenancyApplications,
        unit: units,
        property: properties,
        applicant: user,
      })
      .from(tenancyApplications)
      .innerJoin(units, eq(units.id, tenancyApplications.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .innerJoin(user, eq(user.id, tenancyApplications.applicantUserId))
      .where(eq(tenancyApplications.id, applicationId))
      .limit(1);

    if (!applicationData) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Verify the current user owns this property
    if (applicationData.property.userId !== clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Parse application data
    let parsedApplicationData: unknown = null;
    try {
      parsedApplicationData = applicationData.application.applicationData
        ? (JSON.parse(applicationData.application.applicationData) as unknown)
        : null;
    } catch {
      console.error("Error parsing application data");
    }

    return NextResponse.json({
      application: {
        id: applicationData.application.id,
        status: applicationData.application.status,
        decision: applicationData.application.decision,
        decisionNotes: applicationData.application.decisionNotes,
        submittedAt: applicationData.application.submittedAt,
        reviewedAt: applicationData.application.reviewedAt,
        paymentSetupComplete: applicationData.application.paymentSetupComplete,
        applicationData: parsedApplicationData,
      },
      unit: {
        id: applicationData.unit.id,
        unitNumber: applicationData.unit.unitNumber,
        monthlyRent: applicationData.unit.monthlyRent,
        currency: applicationData.unit.currency,
      },
      property: {
        id: applicationData.property.id,
        name: applicationData.property.name,
        address: applicationData.property.address,
      },
      applicant: {
        id: applicationData.applicant.id,
        name: `${applicationData.applicant.first_name} ${applicationData.applicant.last_name}`,
        email: applicationData.applicant.email,
        phone: applicationData.applicant.phone,
        imageUrl: applicationData.applicant.image_url,
      },
    });
  } catch (error) {
    console.error("Error fetching application:", error);
    return NextResponse.json(
      { error: "Failed to fetch application" },
      { status: 500 }
    );
  }
}

// PATCH: Review (approve/reject) an application
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applicationId = parseInt(params.id);
    if (isNaN(applicationId)) {
      return NextResponse.json(
        { error: "Invalid application ID" },
        { status: 400 }
      );
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

    // Get application with related data
    const [applicationData] = await db
      .select({
        application: tenancyApplications,
        unit: units,
        property: properties,
        applicant: user,
      })
      .from(tenancyApplications)
      .innerJoin(units, eq(units.id, tenancyApplications.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .innerJoin(user, eq(user.id, tenancyApplications.applicantUserId))
      .where(eq(tenancyApplications.id, applicationId))
      .limit(1);

    if (!applicationData) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Verify the current user owns this property
    if (applicationData.property.userId !== clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if application is still pending
    if (applicationData.application.status !== "pending") {
      return NextResponse.json(
        { error: "This application has already been reviewed" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      decision: "approved" | "rejected";
      decisionNotes?: string;
    };

    if (!body.decision || !["approved", "rejected"].includes(body.decision)) {
      return NextResponse.json(
        { error: "Invalid decision. Must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Update the application
    await db
      .update(tenancyApplications)
      .set({
        status: body.decision,
        decision: body.decision,
        decisionNotes: body.decisionNotes?.trim() ?? null,
        reviewedAt: new Date(),
        reviewedByUserId: currentUser.id,
      })
      .where(eq(tenancyApplications.id, applicationId));

    // Send notification to applicant
    const notificationTitle =
      body.decision === "approved"
        ? "Application Approved!"
        : "Application Update";
    const notificationMessage =
      body.decision === "approved"
        ? `Your application for Unit ${applicationData.unit.unitNumber} at ${applicationData.property.name} has been approved! You will receive an invitation to complete the onboarding process.`
        : `Your application for Unit ${applicationData.unit.unitNumber} at ${applicationData.property.name} has not been approved.${
            body.decisionNotes ? ` Reason: ${body.decisionNotes}` : ""
          }`;

    await createAndEmitNotification({
      userId: applicationData.applicant.id,
      type:
        body.decision === "approved"
          ? "application_approved"
          : "application_rejected",
      title: notificationTitle,
      message: notificationMessage,
      data: JSON.stringify({
        applicationId,
        unitId: applicationData.unit.id,
        propertyId: applicationData.property.id,
        decision: body.decision,
      }),
      actionUrl:
        body.decision === "approved"
          ? `/units/${applicationData.unit.id}`
          : undefined,
    });

    // If approved, create tenant invitation
    if (body.decision === "approved") {
      const invitationToken = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

      await db.insert(tenantInvitations).values({
        unitId: applicationData.unit.id,
        landlordId: currentUser.id,
        tenantEmail: applicationData.applicant.email,
        tenantName: `${applicationData.applicant.first_name} ${applicationData.applicant.last_name}`,
        invitationToken,
        isExistingTenant: true, // They already have an account
        status: "sent",
        expiresAt,
        tenantUserId: applicationData.applicant.id,
      });

      // Send another notification about the invitation
      await createAndEmitNotification({
        userId: applicationData.applicant.id,
        type: "tenant_invitation",
        title: "Complete Your Tenancy Setup",
        message: `Please complete your tenancy onboarding for Unit ${applicationData.unit.unitNumber} at ${applicationData.property.name}`,
        data: JSON.stringify({
          invitationToken,
          unitId: applicationData.unit.id,
          propertyId: applicationData.property.id,
        }),
        actionUrl: `/onboarding?token=${invitationToken}`,
      });
    }

    // Track application review event in PostHog
    await trackServerEvent(clerkUserId, "application_reviewed", {
        application_id: applicationId,
        decision: body.decision,
        unit_id: applicationData.unit.id,
        property_id: applicationData.property.id,
        applicant_id: applicationData.applicant.id,
        source: "api",
      });

    return NextResponse.json({
      success: true,
      message: `Application ${body.decision} successfully`,
    });
  } catch (error) {
    console.error("Error reviewing application:", error);
    return NextResponse.json(
      { error: "Failed to review application" },
      { status: 500 }
    );
  }
}
