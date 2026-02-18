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
import { canCancelNotice } from "~/lib/offboarding";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { getAuthenticatedUser } from "~/server/auth";
import type { UpdateOffboardingRequest, CancelOffboardingRequest } from "~/types/offboarding";
import { trackServerEvent } from "~/lib/posthog-events/server";

// GET /api/offboarding/[id] - Get offboarding notice details
export async function GET(
  _request: NextRequest,
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

    // Verify user is tenant or landlord on the lease
    const { lease } = result;
    if (lease.tenantId !== dbUser.id && lease.landlordId !== dbUser.id) {
      return NextResponse.json(
        { error: "You are not authorized to view this notice" },
        { status: 403 }
      );
    }

    // Get tenant and landlord details
    const [tenant, landlord, initiatedByUser] = await Promise.all([
      db
        .select()
        .from(user)
        .where(eq(user.id, lease.tenantId))
        .limit(1)
        .then((r) => r[0]),
      db
        .select()
        .from(user)
        .where(eq(user.id, lease.landlordId))
        .limit(1)
        .then((r) => r[0]),
      db
        .select()
        .from(user)
        .where(eq(user.id, result.notice.initiatedByUserId))
        .limit(1)
        .then((r) => r[0]),
    ]);

    return NextResponse.json({
      ...result.notice,
      lease: result.lease,
      unit: result.unit,
      property: result.property,
      tenant,
      landlord,
      initiatedByUser,
    });
  } catch (error) {
    console.error("Error fetching offboarding notice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/offboarding/[id] - Update offboarding (schedule inspection, update deposit status)
export async function PATCH(
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

    // Get the notice with lease
    const [result] = await db
      .select({
        notice: tenantOffboardingNotices,
        lease: leases,
      })
      .from(tenantOffboardingNotices)
      .innerJoin(leases, eq(tenantOffboardingNotices.leaseId, leases.id))
      .where(eq(tenantOffboardingNotices.id, noticeId))
      .limit(1);

    if (!result) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    // Only landlord can update offboarding details (inspection, deposit)
    if (result.lease.landlordId !== dbUser.id) {
      return NextResponse.json(
        { error: "Only landlord can update offboarding details" },
        { status: 403 }
      );
    }

    // Check notice status - can't update cancelled or completed notices
    if (result.notice.status === "cancelled" || result.notice.status === "completed") {
      return NextResponse.json(
        { error: "Cannot update a cancelled or completed notice" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as UpdateOffboardingRequest;
    const {
      inspectionDate,
      inspectionNotes,
      inspectionCompleted,
      depositStatus,
      depositNotes,
    } = body;

    // Build update object
    const updateData: Partial<typeof tenantOffboardingNotices.$inferInsert> = {};

    if (inspectionDate !== undefined) {
      updateData.inspectionDate = new Date(inspectionDate);
      // If scheduling inspection, update status
      if (result.notice.status === "active") {
        updateData.status = "inspection_scheduled";
      }
    }

    if (inspectionNotes !== undefined) {
      updateData.inspectionNotes = inspectionNotes;
    }

    if (inspectionCompleted !== undefined) {
      updateData.inspectionCompleted = inspectionCompleted;
    }

    if (depositStatus !== undefined) {
      updateData.depositStatus = depositStatus;
    }

    if (depositNotes !== undefined) {
      updateData.depositNotes = depositNotes;
    }

    // Update the notice
    const [updatedNotice] = await db
      .update(tenantOffboardingNotices)
      .set(updateData)
      .where(eq(tenantOffboardingNotices.id, noticeId))
      .returning();

    // If inspection was scheduled, notify tenant
    if (inspectionDate && result.lease.tenantId) {
      await createAndEmitNotification({
        userId: result.lease.tenantId,
        type: "inspection_scheduled",
        title: "Move-Out Inspection Scheduled",
        message: `Your move-out inspection has been scheduled for ${new Date(inspectionDate).toLocaleDateString()}.`,
        data: JSON.stringify({
          noticeId,
          inspectionDate,
        }),
        actionUrl: "/dashboard",
      });
    }

    return NextResponse.json({ notice: updatedNotice });
  } catch (error) {
    console.error("Error updating offboarding notice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/offboarding/[id] - Cancel the notice
export async function DELETE(
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

    // Get the notice with lease details
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

    // Verify user is tenant or landlord on this lease
    const isTenant = lease.tenantId === dbUser.id;
    const isLandlord = lease.landlordId === dbUser.id;

    if (!isTenant && !isLandlord) {
      return NextResponse.json(
        { error: "You are not authorized to cancel this notice" },
        { status: 403 }
      );
    }

    // Check if notice can be cancelled
    if (!canCancelNotice(notice)) {
      return NextResponse.json(
        { error: "This notice cannot be cancelled" },
        { status: 400 }
      );
    }

    // Parse body for cancellation reason
    let cancellationReason: string | undefined;
    try {
      const body = (await request.json()) as CancelOffboardingRequest;
      cancellationReason = body.cancellationReason;
    } catch {
      // Body is optional
    }

    // Update the notice to cancelled
    const [cancelledNotice] = await db
      .update(tenantOffboardingNotices)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledByUserId: dbUser.id,
        cancellationReason: cancellationReason ?? null,
      })
      .where(eq(tenantOffboardingNotices.id, noticeId))
      .returning();

    // Revert lease status to active
    await db
      .update(leases)
      .set({ status: "active" })
      .where(eq(leases.id, lease.id));

    // Notify the other party
    const notifyUserId = isTenant ? lease.landlordId : lease.tenantId;
    const cancellerName = `${dbUser.first_name} ${dbUser.last_name}`;

    await createAndEmitNotification({
      userId: notifyUserId,
      type: "notice_cancelled",
      title: "Move-Out Notice Cancelled",
      message: `${cancellerName} has cancelled the move-out notice for Unit ${unit.unitNumber} at ${property.name}.`,
      data: JSON.stringify({
        noticeId,
        leaseId: lease.id,
        cancelledBy: isTenant ? "tenant" : "landlord",
      }),
      actionUrl: isTenant ? `/my-properties?tab=tenants` : `/dashboard`,
    });

    // Track notice_cancelled
    void trackServerEvent(dbUser.auth_id, "notice_cancelled", {
      lease_id: lease.id,
      notice_id: noticeId,
    });

    return NextResponse.json({
      notice: cancelledNotice,
      message: "Notice cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling offboarding notice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
