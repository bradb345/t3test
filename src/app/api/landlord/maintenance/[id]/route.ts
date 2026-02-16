import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import {
  maintenanceRequests,
  units,
  properties,
  notifications,
} from "~/server/db/schema";
import { eq, and, like } from "drizzle-orm";
import { hasRole } from "~/lib/roles";
import { createAndEmitNotification } from "~/server/notification-emitter";
import {
  VALID_MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_TRANSITIONS,
} from "~/lib/constants/maintenance";
import { getAuthenticatedUser } from "~/server/auth";

// PATCH: Update maintenance request status/notes
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.error) return authResult.error;
    const dbUser = authResult.user;

    if (!hasRole(dbUser.roles, "landlord")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestId = parseInt(params.id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    // Get the maintenance request with unit and property info
    const [existingRequest] = await db
      .select({
        request: maintenanceRequests,
        unit: units,
        property: properties,
      })
      .from(maintenanceRequests)
      .innerJoin(units, eq(units.id, maintenanceRequests.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(eq(maintenanceRequests.id, requestId))
      .limit(1);

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    // Verify the landlord owns this property
    if (existingRequest.property.userId !== dbUser.auth_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      status?: string;
      notes?: string | null;
      scheduledFor?: string | null;
    };

    // Validate status if provided
    if (body.status !== undefined) {
      if (!VALID_MAINTENANCE_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      // Check if transition is allowed
      const allowedTransitions =
        MAINTENANCE_STATUS_TRANSITIONS[existingRequest.request.status] ?? [];
      if (
        body.status !== existingRequest.request.status &&
        !allowedTransitions.includes(body.status)
      ) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${existingRequest.request.status} to ${body.status}`,
          },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: {
      status?: string;
      notes?: string | null;
      scheduledFor?: Date | null;
      completedAt?: Date | null;
    } = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
      // Set completedAt if marking as completed
      if (body.status === "completed") {
        updateData.completedAt = new Date();
      }
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (body.scheduledFor !== undefined) {
      if (body.scheduledFor) {
        const parsed = new Date(body.scheduledFor);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json({ error: "Invalid scheduledFor date" }, { status: 400 });
        }
        updateData.scheduledFor = parsed;
      } else {
        updateData.scheduledFor = null;
      }
    }

    // Update the maintenance request
    const [updatedRequest] = await db
      .update(maintenanceRequests)
      .set(updateData)
      .where(eq(maintenanceRequests.id, requestId))
      .returning();

    // Mark any related notifications for this landlord as read
    // This covers the case where the landlord updates from the dashboard without clicking the notification
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, dbUser.id),
          eq(notifications.type, "maintenance_request"),
          eq(notifications.read, false),
          like(notifications.data, `%"maintenanceRequestId":${String(requestId)}%`)
        )
      );

    // Notify tenant if status changed
    if (body.status && body.status !== existingRequest.request.status) {
      const statusMessages: Record<string, string> = {
        in_progress: "Your maintenance request is now being worked on",
        completed: "Your maintenance request has been completed",
        cancelled: "Your maintenance request has been cancelled",
      };

      const message = statusMessages[body.status];
      if (message) {
        await createAndEmitNotification({
          userId: existingRequest.request.requestedBy,
          type: "maintenance_update",
          title: "Maintenance Request Updated",
          message: `${message}: ${existingRequest.request.title}`,
          data: JSON.stringify({
            maintenanceRequestId: requestId,
            newStatus: body.status,
          }),
          actionUrl: `/dashboard?tab=maintenance`,
        });
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Error updating maintenance request:", error);
    return NextResponse.json(
      { error: "Failed to update maintenance request" },
      { status: 500 }
    );
  }
}
