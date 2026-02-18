import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import {
  tenancyApplications,
  units,
  properties,
  user,
  leases,
  payments,
} from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { persistTenantProfile } from "~/lib/tenant-profile";
import type { OnboardingData } from "~/lib/tenant-profile";
import { addRoleToUserById } from "~/lib/roles";
import { updateUnitIndex } from "~/lib/algolia";
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
      rentDueDay?: number;
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

    // If approved, create lease + payment directly (no invitation needed)
    if (body.decision === "approved") {
      // 1. Persist tenant profile from application data
      const rawAppData = applicationData.application.applicationData;
      if (rawAppData) {
        const appDataParsed = JSON.parse(rawAppData) as OnboardingData;
        await persistTenantProfile(applicationData.applicant.id, appDataParsed);
      }

      // 2. End any existing active lease on this unit before creating a new one
      await db
        .update(leases)
        .set({ status: "ended", leaseEnd: new Date() })
        .where(
          and(
            eq(leases.unitId, applicationData.unit.id),
            eq(leases.status, "active")
          )
        );

      // 3. Create lease
      const rentDueDay = body.rentDueDay && body.rentDueDay >= 1 && body.rentDueDay <= 28
        ? body.rentDueDay
        : 1;
      const leaseStart = new Date();
      const leaseEnd = new Date();
      leaseEnd.setFullYear(leaseEnd.getFullYear() + 1);

      const [newLease] = await db.insert(leases).values({
        unitId: applicationData.unit.id,
        tenantId: applicationData.applicant.id,
        landlordId: currentUser.id,
        leaseStart,
        leaseEnd,
        monthlyRent: applicationData.unit.monthlyRent ?? "0",
        securityDeposit: applicationData.unit.deposit,
        rentDueDay,
        status: "active",
      }).returning();

      // 3. Create move-in payment
      if (newLease) {
        const rentAmount = parseFloat(applicationData.unit.monthlyRent ?? "0");
        const depositAmount = parseFloat(applicationData.unit.deposit ?? "0");
        const totalAmount = rentAmount + depositAmount;

        if (totalAmount > 0) {
          const [existingMoveIn] = await db
            .select({ id: payments.id })
            .from(payments)
            .where(
              and(
                eq(payments.leaseId, newLease.id),
                eq(payments.type, "move_in")
              )
            )
            .limit(1);

          if (!existingMoveIn) {
            await db.insert(payments).values({
              tenantId: applicationData.applicant.id,
              leaseId: newLease.id,
              amount: totalAmount.toFixed(2),
              currency: newLease.currency,
              type: "move_in",
              status: "pending",
              dueDate: leaseStart,
              notes: JSON.stringify({
                rentAmount: rentAmount.toFixed(2),
                securityDeposit: depositAmount.toFixed(2),
              }),
            });
          }
        }
      }

      // 4. Mark unit as unavailable and hidden
      await db
        .update(units)
        .set({
          isAvailable: false,
          isVisible: false,
          updatedAt: new Date(),
        })
        .where(eq(units.id, applicationData.unit.id));

      // 5. Sync to Algolia
      await updateUnitIndex(applicationData.unit.id, {
        isAvailable: false,
        isVisible: false,
      });

      // 6. Assign tenant role
      await addRoleToUserById(applicationData.applicant.id, "tenant");
    }

    // Send notification to applicant
    const notificationTitle =
      body.decision === "approved"
        ? "Application Approved!"
        : "Application Update";
    const notificationMessage =
      body.decision === "approved"
        ? `Your application for Unit ${applicationData.unit.unitNumber} at ${applicationData.property.name} has been approved! Your lease has been created. Please sign in to make your move-in payment.`
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
          ? "/dashboard?tab=payments"
          : undefined,
    });

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
