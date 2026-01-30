import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import {
  user,
  leases,
  units,
  properties,
  tenantOffboardingNotices,
} from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { completeOffboardingProcess } from "~/server/offboarding";
import { getAuthenticatedUser } from "~/server/auth";
import type { CompleteOffboardingRequest } from "~/types/offboarding";

// POST /api/offboarding/[id]/complete - Complete offboarding
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.error) return authResult.error;
    const dbUser = authResult.user;

    const { id } = await params;
    const noticeId = parseInt(id);

    if (isNaN(noticeId)) {
      return NextResponse.json({ error: "Invalid notice ID" }, { status: 400 });
    }

    // Get the notice with all details
    const [result] = await db
      .select({
        notice: tenantOffboardingNotices,
        lease: leases,
        unit: units,
        property: properties,
      })
      .from(tenantOffboardingNotices)
      .innerJoin(leases, eq(tenantOffboardingNotices.leaseId, leases.id))
      .innerJoin(units, eq(leases.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(eq(tenantOffboardingNotices.id, noticeId))
      .limit(1);

    if (!result) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    const { notice, lease, unit, property } = result;

    // Only landlord can complete offboarding
    if (lease.landlordId !== dbUser.id) {
      return NextResponse.json(
        { error: "Only landlord can complete offboarding" },
        { status: 403 }
      );
    }

    // Check notice status
    if (notice.status === "completed") {
      return NextResponse.json(
        { error: "Offboarding is already completed" },
        { status: 400 }
      );
    }

    if (notice.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot complete a cancelled notice" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = (await request.json()) as CompleteOffboardingRequest;
    const { inspectionNotes, depositStatus, depositNotes } = body;

    if (!depositStatus) {
      return NextResponse.json(
        { error: "Deposit status is required" },
        { status: 400 }
      );
    }

    // Update the notice to completed
    const [completedNotice] = await db
      .update(tenantOffboardingNotices)
      .set({
        status: "completed",
        completedAt: new Date(),
        inspectionCompleted: true,
        inspectionNotes: inspectionNotes ?? notice.inspectionNotes,
        depositStatus,
        depositNotes: depositNotes ?? null,
      })
      .where(eq(tenantOffboardingNotices.id, noticeId))
      .returning();

    // Complete offboarding: terminate lease, update unit, sync Algolia, remove tenant role
    const { tenantRoleRemoved } = await completeOffboardingProcess({
      leaseId: lease.id,
      unitId: unit.id,
      tenantId: lease.tenantId,
    });

    // Get tenant details for notification
    const [tenant] = await db
      .select()
      .from(user)
      .where(eq(user.id, lease.tenantId))
      .limit(1);

    // Notify tenant that offboarding is complete
    if (tenant) {
      const landlordName = `${dbUser.first_name} ${dbUser.last_name}`;
      const depositMessage =
        depositStatus === "returned"
          ? "Your full security deposit will be returned."
          : depositStatus === "partial"
            ? "A partial security deposit refund will be processed."
            : depositStatus === "withheld"
              ? "Your security deposit has been withheld. Please contact your landlord for details."
              : "";

      await createAndEmitNotification({
        userId: tenant.id,
        type: "offboarding_complete",
        title: "Move-Out Complete",
        message: `Your move-out from Unit ${unit.unitNumber} at ${property.name} has been completed by ${landlordName}. ${depositMessage}`,
        data: JSON.stringify({
          noticeId,
          leaseId: lease.id,
          unitId: unit.id,
          propertyId: property.id,
          depositStatus,
        }),
      });
    }

    return NextResponse.json({
      notice: completedNotice,
      message: "Offboarding completed successfully",
      unitAvailable: true,
      leaseTerminated: true,
      tenantRoleRemoved,
    });
  } catch (error) {
    console.error("Error completing offboarding:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
