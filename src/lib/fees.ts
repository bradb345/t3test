/**
 * Platform fee configuration — single source of truth.
 *
 * All fee calculations operate in cents (integers) to avoid
 * floating-point rounding issues. Use toCents/toDollars to convert
 * at the boundary (e.g., from DB decimals or for UI display).
 *
 * Change PLATFORM_FEE_PERCENT here and all fee calculations,
 * UI labels, and (future) Stripe integration will update accordingly.
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
