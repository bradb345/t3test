import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { hasRole } from "~/lib/roles";

// GET: Get current user profile
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

  return NextResponse.json(dbUser);
}

// PATCH: Update user profile
export async function PATCH(request: NextRequest) {
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

  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    preferredContactMethod?: string;
  };

  // Validate required fields
  if (body.firstName !== undefined && !body.firstName.trim()) {
    return NextResponse.json(
      { error: "First name cannot be empty" },
      { status: 400 }
    );
  }
  if (body.lastName !== undefined && !body.lastName.trim()) {
    return NextResponse.json(
      { error: "Last name cannot be empty" },
      { status: 400 }
    );
  }

  // Build update object
  const updateData: Partial<typeof user.$inferInsert> = {};

  if (body.firstName !== undefined) {
    updateData.first_name = body.firstName.trim();
  }
  if (body.lastName !== undefined) {
    updateData.last_name = body.lastName.trim();
  }
  if (body.phone !== undefined) {
    updateData.phone = body.phone?.trim() || null;
  }
  if (body.preferredContactMethod !== undefined) {
    updateData.preferredContactMethod = body.preferredContactMethod;
  }

  const [updatedUser] = await db
    .update(user)
    .set(updateData)
    .where(eq(user.id, dbUser.id))
    .returning();

  return NextResponse.json(updatedUser);
}
