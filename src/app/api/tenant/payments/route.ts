import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { payments, leases, user } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
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
import { parseMoveInNotes, type CheckoutLineItem } from "~/lib/payments/types";

// POST: Initiate a payment via Stripe Checkout Session
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

    // Fetch the payment and verify ownership
    const [payment] = await db
      .select()
      .from(payments)
      .where(
        and(eq(payments.id, body.paymentId), eq(payments.tenantId, dbUser.id))
      )
      .limit(1);

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    if (payment.status !== "pending" && payment.status !== "failed") {
      return NextResponse.json(
        { error: "Payment is not in pending status" },
        { status: 400 }
      );
    }

    if (!isOnlinePaymentSupported(payment.currency)) {
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

    // Calculate fees — move-in payments only charge platform fee on rent portion
    const amountCents = toCents(parseFloat(payment.amount));
    let feeCents: number;
    let payoutCents: number;
    let lineItems: CheckoutLineItem[] | undefined;

    if (payment.type === "move_in") {
      const moveInNotes = parseMoveInNotes(payment.notes);
      const rentCents = moveInNotes ? toCents(parseFloat(moveInNotes.rentAmount)) : amountCents;
      const depositCents = moveInNotes ? toCents(parseFloat(moveInNotes.securityDeposit)) : 0;

      feeCents = getMoveInFeeCents(rentCents);
      payoutCents = getMoveInLandlordPayoutCents(rentCents, depositCents);

      lineItems = [{ name: "First Month's Rent", amountCents: rentCents }];
      if (depositCents > 0) {
        lineItems.push({ name: "Security Deposit", amountCents: depositCents });
      }
    } else {
      feeCents = getPlatformFeeCents(amountCents);
      payoutCents = getLandlordPayoutCents(amountCents);
    }

    // Build success/cancel URLs
    const origin = request.headers.get("origin") ?? request.nextUrl.origin;
    const successUrl = `${origin}/dashboard?tab=payments&payment=success`;
    const cancelUrl = `${origin}/dashboard?tab=payments&payment=cancelled`;

    // Create Checkout Session
    const session = await provider.createCheckoutSession({
      amountCents,
      currency: payment.currency,
      customerId: stripeCustomerId,
      connectedAccountId: landlord.stripeConnectedAccountId,
      applicationFeeCents: feeCents,
      successUrl,
      cancelUrl,
      lineItems,
      metadata: {
        paymentId: payment.id.toString(),
        leaseId: lease.id.toString(),
        tenantId: dbUser.id.toString(),
        landlordId: landlord.id.toString(),
      },
    });

    // Update payment record with checkout session info
    await db
      .update(payments)
      .set({
        status: "processing",
        stripeCheckoutSessionId: session.id,
        platformFee: toDollars(feeCents).toFixed(2),
        landlordPayout: toDollars(payoutCents).toFixed(2),
        paymentMethod: "card",
      })
      .where(eq(payments.id, payment.id));

    return NextResponse.json({
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Make payment error:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
