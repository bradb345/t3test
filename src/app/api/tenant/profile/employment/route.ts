import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { employmentInfo } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedTenantWithProfile } from "~/server/auth";

// GET: Get employment info
export async function GET() {
  const auth = await getAuthenticatedTenantWithProfile();
  if (auth.error) {
    // If profile not found (400), return null instead
    return auth.error.status === 400
      ? NextResponse.json(null)
      : auth.error;
  }

  const [employment] = await db
    .select()
    .from(employmentInfo)
    .where(eq(employmentInfo.tenantProfileId, auth.profile.id))
    .limit(1);

  return NextResponse.json(employment ?? null);
}

// PATCH: Update employment info
export async function PATCH(request: NextRequest) {
  const auth = await getAuthenticatedTenantWithProfile();
  if (auth.error) return auth.error;

  const body = (await request.json()) as {
    employerName: string;
    position: string;
    employmentType: string;
    annualIncome?: number | null;
    employerPhone?: string | null;
  };

  // Validate required fields
  if (!body.employerName?.trim()) {
    return NextResponse.json(
      { error: "Employer name is required" },
      { status: 400 }
    );
  }
  if (!body.position?.trim()) {
    return NextResponse.json(
      { error: "Position is required" },
      { status: 400 }
    );
  }
  if (body.annualIncome == null || body.annualIncome <= 0) {
    return NextResponse.json(
      { error: "Annual income is required" },
      { status: 400 }
    );
  }

  // Check if employment record exists
  const [existingEmployment] = await db
    .select()
    .from(employmentInfo)
    .where(eq(employmentInfo.tenantProfileId, auth.profile.id))
    .limit(1);

  const updateData = {
    employerName: body.employerName.trim(),
    position: body.position.trim(),
    employmentType: body.employmentType,
    annualIncome: body.annualIncome?.toString() ?? null,
    employerPhone: body.employerPhone?.trim() ?? null,
  };

  let result;

  if (existingEmployment) {
    [result] = await db
      .update(employmentInfo)
      .set(updateData)
      .where(eq(employmentInfo.id, existingEmployment.id))
      .returning();
  } else {
    [result] = await db
      .insert(employmentInfo)
      .values({
        tenantProfileId: auth.profile.id,
        ...updateData,
      })
      .returning();
  }

  return NextResponse.json(result);
}
