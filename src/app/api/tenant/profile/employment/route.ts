import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { employmentInfo, tenantProfiles, user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { hasRole } from "~/lib/roles";

// GET: Get employment info
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
    return NextResponse.json(null);
  }

  const [employment] = await db
    .select()
    .from(employmentInfo)
    .where(eq(employmentInfo.tenantProfileId, profile.id))
    .limit(1);

  return NextResponse.json(employment ?? null);
}

// PATCH: Update employment info
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

  // Check if employment record exists
  const [existingEmployment] = await db
    .select()
    .from(employmentInfo)
    .where(eq(employmentInfo.tenantProfileId, profile.id))
    .limit(1);

  const updateData = {
    employerName: body.employerName.trim(),
    position: body.position.trim(),
    employmentType: body.employmentType,
    annualIncome: body.annualIncome?.toString() ?? "0",
    employerPhone: body.employerPhone?.trim() || null,
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
        tenantProfileId: profile.id,
        ...updateData,
      })
      .returning();
  }

  return NextResponse.json(result);
}
