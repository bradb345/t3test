import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { user, leases, tenancyApplications } from "~/server/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { parseRoles, hasRole } from "~/lib/roles";

// GET: Check if current user is a tenant with an active lease or pending application
export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ roles: [], hasActiveLease: false, hasPendingApplication: false });
  }

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!dbUser) {
    return NextResponse.json({ roles: [], hasActiveLease: false, hasPendingApplication: false });
  }

  const roles = parseRoles(dbUser.roles);
  const isTenant = hasRole(dbUser.roles, "tenant");

  // Only check for active lease if user has tenant role
  let hasActiveLease = false;
  if (isTenant) {
    const [activeLease] = await db
      .select({ id: leases.id })
      .from(leases)
      .where(
        and(
          eq(leases.tenantId, dbUser.id),
          or(eq(leases.status, "active"), eq(leases.status, "notice_given"))
        )
      )
      .limit(1);

    hasActiveLease = !!activeLease;
  }

  // Check for pending or under_review applications
  const [pendingApp] = await db
    .select({ id: tenancyApplications.id })
    .from(tenancyApplications)
    .where(
      and(
        eq(tenancyApplications.applicantUserId, dbUser.id),
        inArray(tenancyApplications.status, ["pending", "under_review"])
      )
    )
    .limit(1);

  const hasPendingApplication = !!pendingApp;

  return NextResponse.json({ roles, hasActiveLease, hasPendingApplication });
}
