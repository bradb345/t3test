import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { emergencyContacts, tenantProfiles, user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { hasRole } from "~/lib/roles";

// GET: Get emergency contacts
export async function GET() {
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
    return NextResponse.json([]);
  }

  const contacts = await db
    .select()
    .from(emergencyContacts)
    .where(eq(emergencyContacts.tenantProfileId, profile.id));

  return NextResponse.json(contacts);
}

// POST: Add new emergency contact
export async function POST(request: NextRequest) {
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

  const [newContact] = await db
    .insert(emergencyContacts)
    .values({
      tenantProfileId: profile.id,
      fullName: body.fullName.trim(),
      relationship: body.relationship.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
    })
    .returning();

  return NextResponse.json(newContact, { status: 201 });
}
