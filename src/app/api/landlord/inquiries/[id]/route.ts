import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { viewingRequests, units, properties, user, notifications } from "~/server/db/schema";
import { eq, and, like } from "drizzle-orm";
import { hasRole } from "~/lib/roles";
import { trackServerEvent } from "~/lib/posthog-events/server";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { sendAppEmail } from "~/lib/emails/server";

const VALID_STATUSES = ["pending", "approved", "declined", "completed"];

// PATCH: Update viewing request (approve/decline/complete)
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and verify landlord role
    const [dbUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!dbUser || !hasRole(dbUser.roles, "landlord")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestId = parseInt(params.id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    // Get the viewing request with unit and property info
    const [existingRequest] = await db
      .select({
        request: viewingRequests,
        unit: units,
        property: properties,
      })
      .from(viewingRequests)
      .innerJoin(units, eq(units.id, viewingRequests.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(eq(viewingRequests.id, requestId))
      .limit(1);

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Viewing request not found" },
        { status: 404 }
      );
    }

    // Verify the landlord owns this property
    if (existingRequest.property.userId !== clerkUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      status?: string;
      landlordNotes?: string | null;
    };

    // Validate status if provided
    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Build update object
    const updateData: {
      status?: string;
      landlordNotes?: string | null;
      respondedAt?: Date;
    } = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
      // Set respondedAt when status changes from pending
      if (
        existingRequest.request.status === "pending" &&
        body.status !== "pending"
      ) {
        updateData.respondedAt = new Date();
      }
    }

    if (body.landlordNotes !== undefined) {
      updateData.landlordNotes = body.landlordNotes;
    }

    // Update the viewing request
    const [updatedRequest] = await db
      .update(viewingRequests)
      .set(updateData)
      .where(eq(viewingRequests.id, requestId))
      .returning();

    // Mark any related notifications for this landlord as read
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, dbUser.id),
          eq(notifications.type, "viewing_request"),
          eq(notifications.read, false),
          like(notifications.data, `%"viewingRequestId":${String(requestId)}%`)
        )
      );

    // Track viewing_request_responded
    if (body.status && body.status !== existingRequest.request.status) {
      void trackServerEvent(clerkUserId, "viewing_request_responded", {
        request_id: requestId,
        response_status: body.status,
        message_body: body.landlordNotes?.trim() ?? null,
      });
    }

    // Notify tenant when status changes from pending to approved/declined
    if (
      body.status &&
      existingRequest.request.status === "pending" &&
      (body.status === "approved" || body.status === "declined")
    ) {
      const statusLabel = body.status === "approved" ? "Approved" : "Declined";
      const unitNumber = existingRequest.unit.unitNumber;
      const propertyName = existingRequest.property.name;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const listingUrl = `${baseUrl}/units/${existingRequest.unit.id}`;
      const notesMessage = updatedRequest?.landlordNotes
        ? ` Notes: "${updatedRequest.landlordNotes}"`
        : "";

      // Find requester user — prefer requesterUserId, fall back to email match
      let requesterDbUser: { id: number } | undefined;
      if (existingRequest.request.requesterUserId) {
        const [found] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, existingRequest.request.requesterUserId))
          .limit(1);
        requesterDbUser = found;
      } else {
        const [found] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, existingRequest.request.email))
          .limit(1);
        requesterDbUser = found;
      }

      // Send in-app notification if we found the user
      if (requesterDbUser) {
        await createAndEmitNotification({
          userId: requesterDbUser.id,
          type: "viewing_request_response",
          title: `Viewing Request ${statusLabel}`,
          message: `Your viewing request for Unit ${unitNumber} at ${propertyName} has been ${body.status}.${notesMessage}`,
          data: JSON.stringify({
            viewingRequestId: requestId,
            unitId: existingRequest.unit.id,
            propertyId: existingRequest.property.id,
            status: body.status,
          }),
          actionUrl: listingUrl,
        });
      }

      // Send email notification
      await sendAppEmail(existingRequest.request.email, "viewing_request_response", {
        requesterName: existingRequest.request.name,
        unitNumber,
        propertyName,
        status: body.status,
        landlordNotes: updatedRequest?.landlordNotes ?? undefined,
        listingUrl,
      });
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Error updating viewing request:", error);
    return NextResponse.json(
      { error: "Failed to update viewing request" },
      { status: 500 }
    );
  }
}
