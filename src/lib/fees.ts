/**
 * Platform fee configuration — single source of truth.
 *
 * The fee is INCLUSIVE: taken from the rent, not added on top.
 * e.g. $2,000 rent → tenant pays $2,000, platform gets $300, landlord gets $1,700.
 *
 * All fee calculations operate in cents (integers) to avoid
 * floating-point rounding issues. Use toCents/toDollars to convert
 * at the boundary (e.g., from DB decimals or for UI display).
 *
 * Change PLATFORM_FEE_PERCENT here and all fee calculations,
 * UI labels, and Stripe integration will update accordingly.
 */

/** Platform fee as a whole-number percentage (e.g. 15 means 15%). */
export const PLATFORM_FEE_PERCENT = 15;

/** Convert a dollar amount to cents. */
export function toCents(dollars: number): number {
  return Math.round((dollars + Number.EPSILON) * 100);
}

/** Convert cents to a dollar amount. */
export function toDollars(cents: number): number {
  return cents / 100;
}

/** Calculate the platform fee in cents for a given amount in cents. */
export function getPlatformFeeCents(amountCents: number): number {
  return Math.round(amountCents * PLATFORM_FEE_PERCENT / 100);
}

/** Calculate the landlord payout in cents for a given amount in cents. */
export function getLandlordPayoutCents(amountCents: number): number {
  return amountCents - getPlatformFeeCents(amountCents);
}

/** Calculate the platform fee in dollars for a given dollar amount. */
export function getPlatformFee(dollars: number): number {
  return toDollars(getPlatformFeeCents(toCents(dollars)));
}

/** Calculate the landlord payout in dollars for a given dollar amount. */
export function getLandlordPayout(dollars: number): number {
  return toDollars(getLandlordPayoutCents(toCents(dollars)));
}

/**
 * Move-in payment fee: platform fee on rent + full security deposit.
 * The deposit stays with the platform (not forwarded to the landlord).
 */
export function getMoveInFeeCents(rentCents: number, depositCents: number): number {
  return getPlatformFeeCents(rentCents) + depositCents;
}

/**
 * Move-in landlord payout: rent minus platform fee only.
 * Security deposit is retained by the platform.
 */
export function getMoveInLandlordPayoutCents(rentCents: number): number {
  return getLandlordPayoutCents(rentCents);
}
