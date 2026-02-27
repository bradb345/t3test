/**
 * Number of days after a payment's due date before it is considered overdue.
 * Used by both the overdue-payment cron and the delinquency-clearing webhook handler.
 */
export const GRACE_PERIOD_DAYS = 10;
