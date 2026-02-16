import { db } from "~/server/db";
import { payments, user, notifications } from "~/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Handle checkout.session.completed — mark payment as completed and notify.
 */
export async function handleCheckoutSessionCompleted(
  data: Record<string, unknown>
) {
  const sessionId = data.id as string;
  const paymentIntentId = data.payment_intent as string | null;
  const metadata = data.metadata as Record<string, string> | undefined;

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
    message: `Your ${paymentLabel} of $${payment.amount} has been processed successfully.`,
    data: JSON.stringify({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    }),
  });

  // Notify landlord if we have the metadata
  if (metadata?.landlordId) {
    await db.insert(notifications).values({
      userId: parseInt(metadata.landlordId),
      type: "payment_received",
      title: "Payment Received",
      message: `A ${paymentLabel} of $${payment.amount} has been received. Your payout of $${payment.landlordPayout} will be transferred.`,
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
  const metadata = data.metadata as Record<string, string> | undefined;
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
    message: `Your ${intentPaymentLabel} of $${payment.amount} has been processed successfully.`,
    data: JSON.stringify({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    }),
  });

  // Notify landlord if we have the metadata
  if (metadata?.landlordId) {
    await db.insert(notifications).values({
      userId: parseInt(metadata.landlordId),
      type: "payment_received",
      title: "Payment Received",
      message: `A ${intentPaymentLabel} of $${payment.amount} has been received. Your payout of $${payment.landlordPayout} will be transferred.`,
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
    message: `Your payment of $${payment.amount} could not be processed. Please try again with a different payment method.`,
    data: JSON.stringify({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    }),
  });
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
}
