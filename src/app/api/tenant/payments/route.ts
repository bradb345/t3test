import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { payments, leases, user } from "~/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAuthenticatedTenant } from "~/server/auth";
import { getPaymentProvider, isOnlinePaymentSupported } from "~/lib/payments";
import {
  toCents,
  toDollars,
  getPlatformFeeCents,
  getLandlordPayoutCents,
  getMoveInFeeCents,
  getMoveInLandlordPayoutCents,
} from "~/lib/fees";
import { parseMoveInNotes } from "~/lib/payments/types";
import { trackServerEvent } from "~/lib/posthog-events/server";

// POST: Create a PaymentIntent for Stripe Elements (client-side confirmation)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedTenant();
    if (auth.error) return auth.error;

    const dbUser = auth.user;

    const body = (await request.json()) as {
      paymentId: number;
    };

    if (!body.paymentId) {
      return NextResponse.json(
        { error: "paymentId is required" },
        { status: 400 }
      );
    }

    // Auto-create Stripe Customer if tenant doesn't have one
    const provider = getPaymentProvider();
    let stripeCustomerId = dbUser.stripeCustomerId;

    if (!stripeCustomerId) {
      stripeCustomerId = await provider.createCustomer({
        email: dbUser.email,
        name: `${dbUser.first_name} ${dbUser.last_name}`,
        metadata: { userId: dbUser.id.toString() },
      });

      await db
        .update(user)
        .set({ stripeCustomerId })
        .where(eq(user.id, dbUser.id));
    }

    // Atomically claim the payment by updating status to "processing" only if
    // it's currently in a retryable state. This prevents race conditions where
    // two concurrent requests both see "pending" and create duplicate intents.
    const retryableStatuses = ["pending", "failed", "processing"];
    const [payment] = await db
      .update(payments)
      .set({ status: "processing" })
      .where(
        and(
          eq(payments.id, body.paymentId),
          eq(payments.tenantId, dbUser.id),
          inArray(payments.status, retryableStatuses),
        )
      )
      .returning();

    if (!payment) {
      // Either payment doesn't exist, doesn't belong to this tenant, or is not retryable
      return NextResponse.json(
        { error: "Payment not found or is not in a retryable status" },
        { status: 400 }
      );
    }

    if (!isOnlinePaymentSupported(payment.currency)) {
      // Reset status back since we claimed it
      await db
        .update(payments)
        .set({ status: "pending" })
        .where(eq(payments.id, payment.id));
      return NextResponse.json(
        { error: "Online payments are not supported for this currency" },
        { status: 400 }
      );
    }

    // Fetch the lease and landlord
    const [lease] = await db
      .select()
      .from(leases)
      .where(eq(leases.id, payment.leaseId))
      .limit(1);

    if (!lease) {
      return NextResponse.json(
        { error: "Lease not found" },
        { status: 404 }
      );
    }

    const [landlord] = await db
      .select()
      .from(user)
      .where(eq(user.id, lease.landlordId))
      .limit(1);

    if (!landlord?.stripeConnectedAccountId) {
      return NextResponse.json(
        {
          error:
            "This landlord hasn't completed their payment setup yet. Please contact them directly to arrange payment.",
        },
        { status: 400 }
      );
    }

    // If there's already a PaymentIntent for this payment, reuse it instead
    // of creating a duplicate. This handles React Strict Mode double-mounts
    // and users re-opening the modal after closing without paying.
    if (payment.stripePaymentIntentId) {
      const existingIntent = await provider.getPaymentIntent(payment.stripePaymentIntentId);
      if (existingIntent.clientSecret && existingIntent.status !== "succeeded" && existingIntent.status !== "canceled") {
        return NextResponse.json({
          clientSecret: existingIntent.clientSecret,
          paymentIntentId: existingIntent.id,
        });
      }
    }

    // Calculate fees — move-in payments only charge platform fee on rent portion
    const amountDollars = parseFloat(payment.amount);
    if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }
    const amountCents = toCents(amountDollars);
    let feeCents: number;
    let payoutCents: number;

    if (payment.type === "move_in") {
      const moveInNotes = parseMoveInNotes(payment.notes);

      if (moveInNotes) {
        const rentDollars = parseFloat(moveInNotes.rentAmount);
        const depositDollars = parseFloat(moveInNotes.securityDeposit);
        if (!Number.isFinite(rentDollars) || rentDollars <= 0) {
          return NextResponse.json(
            { error: "Invalid move-in rent amount" },
            { status: 400 }
          );
        }
        if (!Number.isFinite(depositDollars) || depositDollars < 0) {
          return NextResponse.json(
            { error: "Invalid move-in security deposit amount" },
            { status: 400 }
          );
        }
      }

      const rentCents = moveInNotes ? toCents(parseFloat(moveInNotes.rentAmount)) : amountCents;
      const depositCents = moveInNotes ? toCents(parseFloat(moveInNotes.securityDeposit)) : 0;

      feeCents = getMoveInFeeCents(rentCents);
      payoutCents = getMoveInLandlordPayoutCents(rentCents, depositCents);
    } else {
      feeCents = getPlatformFeeCents(amountCents);
      payoutCents = getLandlordPayoutCents(amountCents);
    }

    // Create unconfirmed PaymentIntent for Elements.
    // Use an idempotency key tied to the payment ID so that concurrent
    // requests (e.g. React Strict Mode double-mount) don't create duplicates.
    const intent = await provider.createPaymentIntentForElements({
      amountCents,
      currency: payment.currency,
      customerId: stripeCustomerId,
      connectedAccountId: landlord.stripeConnectedAccountId,
      applicationFeeCents: feeCents,
      metadata: {
        paymentId: payment.id.toString(),
        leaseId: lease.id.toString(),
        tenantId: dbUser.id.toString(),
        landlordId: landlord.id.toString(),
      },
      idempotencyKey: `payment_intent_${payment.id}_${amountCents}`,
    });

    // Update payment record with intent info (status already set to "processing" above)
    await db
      .update(payments)
      .set({
        stripePaymentIntentId: intent.id,
        platformFee: toDollars(feeCents).toFixed(2),
        landlordPayout: toDollars(payoutCents).toFixed(2),
        paymentMethod: "card",
      })
      .where(eq(payments.id, payment.id));

    // Track payment_initiated
    void trackServerEvent(dbUser.auth_id, "payment_initiated", {
      payment_id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      payment_type: payment.type,
      lease_id: payment.leaseId,
    });

    return NextResponse.json({
      clientSecret: intent.clientSecret,
      paymentIntentId: intent.id,
    });
  } catch (error) {
    console.error("Make payment error:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}

// PATCH: Reset a payment back to pending (e.g. user closed modal without paying)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedTenant();
    if (auth.error) return auth.error;

    const dbUser = auth.user;

    const body = (await request.json()) as {
      paymentId: number;
      action: string;
    };

    if (!body.paymentId || body.action !== "cancel") {
      return NextResponse.json(
        { error: "paymentId and action='cancel' are required" },
        { status: 400 }
      );
    }

    // Only reset if currently "processing" and belongs to this tenant.
    // Keep stripePaymentIntentId so the intent can be reused on next open.
    const [payment] = await db
      .update(payments)
      .set({
        status: "pending",
      })
      .where(
        and(
          eq(payments.id, body.paymentId),
          eq(payments.tenantId, dbUser.id),
          eq(payments.status, "processing"),
        )
      )
      .returning();

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found or not in processing status" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel payment error:", error);
    return NextResponse.json(
      { error: "Failed to cancel payment" },
      { status: 500 }
    );
  }
}
