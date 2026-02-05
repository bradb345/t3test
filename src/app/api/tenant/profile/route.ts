import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedTenant } from "~/server/auth";

// GET: Get current user profile
export async function GET() {
  const auth = await getAuthenticatedTenant();
  if (auth.error) return auth.error;

  return NextResponse.json(auth.user);
}

// PATCH: Update user profile
export async function PATCH(request: NextRequest) {
  const auth = await getAuthenticatedTenant();
  if (auth.error) return auth.error;

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
    updateData.phone = body.phone?.trim() ?? null;
  }
  if (body.preferredContactMethod !== undefined) {
    updateData.preferredContactMethod = body.preferredContactMethod;
  }

  const [updatedUser] = await db
    .update(user)
    .set(updateData)
    .where(eq(user.id, auth.user.id))
    .returning();

  return NextResponse.json(updatedUser);
}
