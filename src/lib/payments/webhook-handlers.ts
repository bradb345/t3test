import { db } from "~/server/db";
import { payments, leases, user, notifications } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { trackServerEvent } from "~/lib/posthog-events/server";

function formatAmount(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (Number.isNaN(num)) return `${currency} ${amount}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(num);
}

/** Look up auth_id for a user by their DB id (needed in webhook context). */
async function getAuthIdForUser(userId: number): Promise<string | null> {
  const [result] = await db
    .select({ authId: user.auth_id })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return result?.authId ?? null;
}

/** Derive landlordId from the payment's lease (DB lookup, not metadata). */
async function getLandlordIdForPayment(leaseId: number): Promise<number | null> {
  const [lease] = await db
    .select({ landlordId: leases.landlordId })
    .from(leases)
    .where(eq(leases.id, leaseId))
    .limit(1);
  return lease?.landlordId ?? null;
}

/**
 * Handle checkout.session.completed — mark payment as completed and notify.
 */
export async function handleCheckoutSessionCompleted(
  data: Record<string, unknown>
) {
  const sessionId = data.id as string;
  const paymentIntentId = data.payment_intent as string | null;

  if (!sessionId) return;

  // Find the payment by checkout session ID
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripeCheckoutSessionId, sessionId))
    .limit(1);

  if (!payment) {
    console.warn(`No payment found for Checkout Session ${sessionId}`);
    return;
  }

  // Update payment to completed, store the PaymentIntent ID from the session
  await db
    .update(payments)
    .set({
      status: "completed",
      paidAt: new Date(),
      transactionId: paymentIntentId ?? sessionId,
      stripePaymentIntentId: paymentIntentId,
    })
    .where(eq(payments.id, payment.id));

  // Derive contextual label
  const paymentLabel = payment.type === "move_in" ? "move-in payment" : "rent payment";

  // Notify tenant
  await db.insert(notifications).values({
    userId: payment.tenantId,
    type: "payment_completed",
    title: "Payment Successful",
    message: `Your ${paymentLabel} of ${formatAmount(payment.amount, payment.currency)} has been processed successfully.`,
    data: JSON.stringify({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    }),
  });

  // Notify landlord — derive from DB, not metadata
  const landlordId = await getLandlordIdForPayment(payment.leaseId);
  if (landlordId) {
    await db.insert(notifications).values({
      userId: landlordId,
      type: "payment_received",
      title: "Payment Received",
      message: `A ${paymentLabel} of ${formatAmount(payment.amount, payment.currency)} has been received. Your payout of ${formatAmount(payment.landlordPayout ?? "0", payment.currency)} will be transferred.`,
      data: JSON.stringify({
        paymentId: payment.id,
        amount: payment.amount,
        landlordPayout: payment.landlordPayout,
        currency: payment.currency,
      }),
    });
  }

  // Track payment_completed
  const tenantAuthId = await getAuthIdForUser(payment.tenantId);
  if (tenantAuthId) {
    void trackServerEvent(tenantAuthId, "payment_completed", {
      payment_id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      payment_type: payment.type,
    });
  }
}

/**
 * Handle checkout.session.expired — reset payment so tenant can retry.
 */
export async function handleCheckoutSessionExpired(
  data: Record<string, unknown>
) {
  const sessionId = data.id as string;

  if (!sessionId) return;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripeCheckoutSessionId, sessionId))
    .limit(1);

  if (!payment) {
    console.warn(`No payment found for expired Checkout Session ${sessionId}`);
    return;
  }

  // Reset to pending and clear session ID so tenant can retry
  await db
    .update(payments)
    .set({
      status: "pending",
      stripeCheckoutSessionId: null,
    })
    .where(eq(payments.id, payment.id));
}

/**
 * Handle payment_intent.succeeded — mark payment as completed and notify.
 * Includes idempotency guard: skips if already completed by checkout.session.completed.
 */
export async function handlePaymentIntentSucceeded(
  data: Record<string, unknown>
) {
  const paymentIntentId = data.id as string;
  const transferId =
    ((data.latest_charge as Record<string, unknown>)?.transfer as string) ??
    (data.transfer as string) ??
    null;

  if (!paymentIntentId) return;

  // Find and update the payment record
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, paymentIntentId))
    .limit(1);

  if (!payment) {
    console.warn(`No payment found for PaymentIntent ${paymentIntentId}`);
    return;
  }

  // Idempotency: skip if already completed (checkout.session.completed fires first)
  if (payment.status === "completed") {
    // Just update the transfer ID if we have it
    if (transferId) {
      await db
        .update(payments)
        .set({ stripeTransferId: transferId })
        .where(eq(payments.id, payment.id));
    }
    return;
  }

  await db
    .update(payments)
    .set({
      status: "completed",
      paidAt: new Date(),
      transactionId: paymentIntentId,
      stripeTransferId: transferId,
    })
    .where(eq(payments.id, payment.id));

  // Derive contextual label
  const intentPaymentLabel = payment.type === "move_in" ? "move-in payment" : "rent payment";

  // Notify tenant
  await db.insert(notifications).values({
    userId: payment.tenantId,
    type: "payment_completed",
    title: "Payment Successful",
    message: `Your ${intentPaymentLabel} of ${formatAmount(payment.amount, payment.currency)} has been processed successfully.`,
    data: JSON.stringify({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    }),
  });

  // Notify landlord — derive from DB, not metadata
  const intentLandlordId = await getLandlordIdForPayment(payment.leaseId);
  if (intentLandlordId) {
    await db.insert(notifications).values({
      userId: intentLandlordId,
      type: "payment_received",
      title: "Payment Received",
      message: `A ${intentPaymentLabel} of ${formatAmount(payment.amount, payment.currency)} has been received. Your payout of ${formatAmount(payment.landlordPayout ?? "0", payment.currency)} will be transferred.`,
      data: JSON.stringify({
        paymentId: payment.id,
        amount: payment.amount,
        landlordPayout: payment.landlordPayout,
        currency: payment.currency,
      }),
    });
  }
}

/**
 * Handle payment_intent.payment_failed — mark payment as failed and notify.
 */
export async function handlePaymentIntentFailed(
  data: Record<string, unknown>
) {
  const paymentIntentId = data.id as string;

  if (!paymentIntentId) return;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, paymentIntentId))
    .limit(1);

  if (!payment) {
    console.warn(`No payment found for PaymentIntent ${paymentIntentId}`);
    return;
  }

  // Mark as failed so tenant can retry
  await db
    .update(payments)
    .set({ status: "failed" })
    .where(eq(payments.id, payment.id));

  // Notify tenant
  await db.insert(notifications).values({
    userId: payment.tenantId,
    type: "payment_failed",
    title: "Payment Failed",
    message: `Your payment of ${formatAmount(payment.amount, payment.currency)} could not be processed. Please try again with a different payment method.`,
    data: JSON.stringify({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    }),
  });

  // Track payment_failed
  const failedTenantAuthId = await getAuthIdForUser(payment.tenantId);
  if (failedTenantAuthId) {
    void trackServerEvent(failedTenantAuthId, "payment_failed", {
      payment_id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    });
  }
}

/**
 * Handle account.updated — sync landlord Connect account status.
 */
export async function handleAccountUpdated(data: Record<string, unknown>) {
  const accountId = data.id as string;
  const payoutsEnabled = data.payouts_enabled as boolean;
  const chargesEnabled = data.charges_enabled as boolean;

  if (!accountId) return;

  const newStatus =
    payoutsEnabled && chargesEnabled ? "complete" : "pending";

  await db
    .update(user)
    .set({ stripeConnectedAccountStatus: newStatus })
    .where(eq(user.stripeConnectedAccountId, accountId));

  // Track stripe_connect_completed when onboarding finishes
  if (newStatus === "complete") {
    const [landlord] = await db
      .select({ authId: user.auth_id })
      .from(user)
      .where(eq(user.stripeConnectedAccountId, accountId))
      .limit(1);
    if (landlord?.authId) {
      void trackServerEvent(landlord.authId, "stripe_connect_completed", {
        account_id: accountId,
      });
    }
  }
}
