import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { emergencyContacts } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedTenantWithProfile } from "~/server/auth";

// GET: Get emergency contacts
export async function GET() {
  const auth = await getAuthenticatedTenantWithProfile();
  if (auth.error) {
    // If profile not found (400), return empty array instead
    return auth.error.status === 400
      ? NextResponse.json([])
      : auth.error;
  }

  const contacts = await db
    .select()
    .from(emergencyContacts)
    .where(eq(emergencyContacts.tenantProfileId, auth.profile.id));

  return NextResponse.json(contacts);
}

// POST: Add new emergency contact
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedTenantWithProfile();
  if (auth.error) return auth.error;

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
      tenantProfileId: auth.profile.id,
      fullName: body.fullName.trim(),
      relationship: body.relationship.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
    })
    .returning();

  return NextResponse.json(newContact, { status: 201 });
}
