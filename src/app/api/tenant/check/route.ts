import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { user, leases } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { parseRoles, hasRole } from "~/lib/roles";

// GET: Check if current user is a tenant with an active lease
export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ roles: [], hasActiveLease: false });
  }

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!dbUser) {
    return NextResponse.json({ roles: [], hasActiveLease: false });
  }

  const roles = parseRoles(dbUser.roles);
  const isTenant = hasRole(dbUser.roles, "tenant");

  // Only check for active lease if user has tenant role
  let hasActiveLease = false;
  if (isTenant) {
    const [activeLease] = await db
      .select({ id: leases.id })
      .from(leases)
      .where(and(eq(leases.tenantId, dbUser.id), eq(leases.status, "active")))
      .limit(1);

    hasActiveLease = !!activeLease;
  }

  return NextResponse.json({ roles, hasActiveLease });
}
