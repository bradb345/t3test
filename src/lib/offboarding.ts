/**
 * Helper functions for tenant offboarding flow
 */

import type { OffboardingNotice, OffboardingStatus } from "~/types/offboarding";

/**
 * Calculate move-out date (2 months from notice date)
 * The move-out date is calculated by adding 2 calendar months to the notice date
 */
export function calculateMoveOutDate(noticeDate: Date): Date {
  const moveOutDate = new Date(noticeDate);
  const originalDay = moveOutDate.getDate();
  moveOutDate.setMonth(moveOutDate.getMonth() + 2);
  // Handle month overflow (e.g., Jan 31 + 2 months should be Mar 31, not Apr 3)
  if (moveOutDate.getDate() !== originalDay) {
    // Overflowed into next month, set to last day of intended month
    moveOutDate.setDate(0);
  }
  return moveOutDate;
}

/**
 * Check if a user can give notice for a lease
 * Only the tenant or landlord on the lease can give notice
 * Lease must be active (not already in notice period or terminated)
 */
export function canGiveNotice(
  leaseStatus: string,
  leaseTenantId: number,
  leaseLandlordId: number,
  userId: number
): boolean {
  // Lease must be active
  if (leaseStatus !== "active") {
    return false;
  }
  // User must be either the tenant or landlord
  return leaseTenantId === userId || leaseLandlordId === userId;
}

/**
 * Check if a notice can be cancelled
 * Notice can only be cancelled if:
 * - Status is still "active"
 * - Current date is before move-out date
 */
export function canCancelNotice(notice: OffboardingNotice): boolean {
  if (notice.status !== "active") {
    return false;
  }
  return new Date() < new Date(notice.moveOutDate);
}

/**
 * Get days until move-out date
 */
export function getDaysUntilMoveOut(moveOutDate: Date): number {
  const now = new Date();
  const moveOut = new Date(moveOutDate);
  const diffTime = moveOut.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format move-out date for display
 */
export function formatMoveOutDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: OffboardingStatus): string {
  switch (status) {
    case "active":
      return "Notice Active";
    case "cancelled":
      return "Cancelled";
    case "inspection_scheduled":
      return "Inspection Scheduled";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}

/**
 * Get deposit status label
 */
export function getDepositStatusLabel(
  status: "pending" | "returned" | "withheld" | "partial" | null
): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "returned":
      return "Full Refund";
    case "withheld":
      return "Withheld";
    case "partial":
      return "Partial Refund";
    default:
      return "Pending";
  }
}

/**
 * Check if offboarding is complete and can mark lease as terminated
 */
export function canCompleteOffboarding(notice: OffboardingNotice): boolean {
  // Must be past move-out date or inspection completed
  const isPastMoveOut = new Date() >= new Date(notice.moveOutDate);
  const hasInspection = notice.inspectionCompleted === true;
  return (isPastMoveOut || hasInspection) && notice.status !== "completed" && notice.status !== "cancelled";
}
