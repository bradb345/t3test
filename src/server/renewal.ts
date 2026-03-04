/**
 * Shared lease renewal logic.
 * Handles the transition from old lease (active -> renewed)
 * and new lease (pending_renewal -> active).
 */

import { db } from "~/server/db";
import { leases } from "~/server/db/schema";
import { eq } from "drizzle-orm";

interface ActivateRenewalLeaseParams {
  newLeaseId: number;
  oldLeaseId: number;
}

/**
 * Activates a renewal lease:
 * 1. Sets old lease status to "renewed"
 * 2. Sets new lease status to "active" with leaseSignedAt = now
 *
 * Unit stays occupied — no availability or Algolia changes needed.
 */
export async function activateRenewalLease({
  newLeaseId,
  oldLeaseId,
}: ActivateRenewalLeaseParams): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(leases)
      .set({ status: "renewed" })
      .where(eq(leases.id, oldLeaseId));

    await tx
      .update(leases)
      .set({ status: "active", leaseSignedAt: new Date() })
      .where(eq(leases.id, newLeaseId));
  });
}
