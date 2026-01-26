import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { emergencyContacts, tenantProfiles, user } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { hasRole } from "~/lib/roles";

// PATCH: Update emergency contact
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!dbUser || !hasRole(dbUser.roles, "tenant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get tenant profile
  const [profile] = await db
    .select()
    .from(tenantProfiles)
    .where(eq(tenantProfiles.userId, dbUser.id))
    .limit(1);

  if (!profile) {
    return NextResponse.json(
      { error: "Tenant profile not found" },
      { status: 400 }
    );
  }

  const { id } = await params;
  const contactId = parseInt(id, 10);

  if (isNaN(contactId)) {
    return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
  }

  // Verify the contact belongs to this tenant
  const [existingContact] = await db
    .select()
    .from(emergencyContacts)
    .where(
      and(
        eq(emergencyContacts.id, contactId),
        eq(emergencyContacts.tenantProfileId, profile.id)
      )
    )
    .limit(1);

  if (!existingContact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    fullName: string;
    relationship: string;
    phone: string;
    email?: string | null;
  };

  // Validate required fields
  if (!body.fullName?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!body.relationship?.trim()) {
    return NextResponse.json(
      { error: "Relationship is required" },
      { status: 400 }
    );
  }
  if (!body.phone?.trim()) {
    return NextResponse.json(
      { error: "Phone number is required" },
      { status: 400 }
    );
  }

  const [updatedContact] = await db
    .update(emergencyContacts)
    .set({
      fullName: body.fullName.trim(),
      relationship: body.relationship.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
    })
    .where(eq(emergencyContacts.id, contactId))
    .returning();

  return NextResponse.json(updatedContact);
}

// DELETE: Delete emergency contact
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!dbUser || !hasRole(dbUser.roles, "tenant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get tenant profile
  const [profile] = await db
    .select()
    .from(tenantProfiles)
    .where(eq(tenantProfiles.userId, dbUser.id))
    .limit(1);

  if (!profile) {
    return NextResponse.json(
      { error: "Tenant profile not found" },
      { status: 400 }
    );
  }

  const { id } = await params;
  const contactId = parseInt(id, 10);

  if (isNaN(contactId)) {
    return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
  }

  // Verify the contact belongs to this tenant
  const [existingContact] = await db
    .select()
    .from(emergencyContacts)
    .where(
      and(
        eq(emergencyContacts.id, contactId),
        eq(emergencyContacts.tenantProfileId, profile.id)
      )
    )
    .limit(1);

  if (!existingContact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  await db.delete(emergencyContacts).where(eq(emergencyContacts.id, contactId));

  return NextResponse.json({ success: true });
}
