import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { viewingRequests, units, properties, user, notifications } from "~/server/db/schema";
import { eq, and, like } from "drizzle-orm";
import { hasRole } from "~/lib/roles";

const VALID_STATUSES = ["pending", "approved", "declined", "completed"];

// PATCH: Update viewing request (approve/decline/complete)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        like(notifications.data, `%"viewingRequestId":${requestId}%`)
      )
    );

  return NextResponse.json(updatedRequest);
}
