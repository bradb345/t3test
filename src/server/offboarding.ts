/**
 * Shared offboarding completion logic.
 * Used by both the standard complete route and the admin fast-track route.
 */

import { db } from "~/server/db";
import { user, leases, units } from "~/server/db/schema";
import { eq, and, ne, or } from "drizzle-orm";
import { removeRole, serializeRoles } from "~/lib/roles";
import { updateUnitIndex } from "~/lib/algolia";

interface CompleteOffboardingParams {
  leaseId: number;
  unitId: number;
  tenantId: number;
}

interface CompleteOffboardingResult {
  tenantRoleRemoved: boolean;
}

/**
 * Handles the shared steps when completing an offboarding:
 * 1. Terminate the lease
 * 2. Set unit as available and visible
 * 3. Sync Algolia index
 * 4. Remove tenant role if no other active leases
 */
export async function completeOffboardingProcess({
  leaseId,
  unitId,
  tenantId,
}: CompleteOffboardingParams): Promise<CompleteOffboardingResult> {
  // Update lease status to terminated
  await db
    .update(leases)
    .set({ status: "terminated" })
    .where(eq(leases.id, leaseId));

  // Set unit as available and visible (inverse of onboarding)
  await db
    .update(units)
    .set({ isAvailable: true, isVisible: true })
    .where(eq(units.id, unitId));

  // Sync Algolia index
  await updateUnitIndex(unitId, {
    isAvailable: true,
    isVisible: true,
  });

  // Check if tenant has any other active leases
  const otherActiveLeases = await db
    .select({ id: leases.id })
    .from(leases)
    .where(
      and(
        eq(leases.tenantId, tenantId),
        or(eq(leases.status, "active"), eq(leases.status, "notice_given")),
        ne(leases.id, leaseId)
      )
    )
    .limit(1);

  // If no other active leases, remove tenant role
  let tenantRoleRemoved = false;
  if (otherActiveLeases.length === 0) {
    const [tenant] = await db
      .select()
      .from(user)
      .where(eq(user.id, tenantId))
      .limit(1);

    if (tenant) {
      const newRoles = removeRole(tenant.roles, "tenant");
      await db
        .update(user)
        .set({ roles: serializeRoles(newRoles) })
        .where(eq(user.id, tenantId));
      tenantRoleRemoved = true;
    }
  }

  return { tenantRoleRemoved };
}
