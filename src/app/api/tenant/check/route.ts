import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { user, leases, tenancyApplications, viewingRequests } from "~/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { parseRoles, hasRole } from "~/lib/roles";

// GET: Check if current user is a tenant with an active lease or pending application
export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ roles: [], hasActiveLease: false, hasPendingApplication: false, hasViewingRequest: false });
  }

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!dbUser) {
    return NextResponse.json({ roles: [], hasActiveLease: false, hasPendingApplication: false, hasViewingRequest: false });
  }

  const roles = parseRoles(dbUser.roles);
  const isTenant = hasRole(dbUser.roles, "tenant");

  // Run independent queries in parallel
  const [activeLeaseResult, pendingAppResult, viewingRequestResult] = await Promise.all([
    isTenant
      ? db
          .select({ id: leases.id })
          .from(leases)
          .where(
            and(
              eq(leases.tenantId, dbUser.id),
              inArray(leases.status, ["active", "notice_given", "pending_signature"])
            )
          )
          .limit(1)
      : Promise.resolve([]),
    db
      .select({ id: tenancyApplications.id })
      .from(tenancyApplications)
      .where(
        and(
          eq(tenancyApplications.applicantUserId, dbUser.id),
          inArray(tenancyApplications.status, ["pending", "under_review"])
        )
      )
      .limit(1),
    db
      .select({ id: viewingRequests.id })
      .from(viewingRequests)
      .where(eq(viewingRequests.requesterUserId, dbUser.id))
      .limit(1),
  ]);

  const hasActiveLease = activeLeaseResult.length > 0;
  const hasPendingApplication = pendingAppResult.length > 0;
  const hasViewingRequest = viewingRequestResult.length > 0;

  return NextResponse.json({ roles, hasActiveLease, hasPendingApplication, hasViewingRequest });
}
