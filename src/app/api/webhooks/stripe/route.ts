import { NextResponse } from "next/server";
import { getPaymentProvider } from "~/lib/payments";
import {
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handleAccountUpdated,
} from "~/lib/payments/webhook-handlers";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const provider = getPaymentProvider();
    const event = provider.constructWebhookEvent(body, signature);

    // Handle each event type — errors are caught per-handler so we can
    // still return 200 to Stripe (preventing unnecessary retries).
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(event.data);
          break;
        case "checkout.session.expired":
          await handleCheckoutSessionExpired(event.data);
          break;
        case "payment_intent.succeeded":
          await handlePaymentIntentSucceeded(event.data);
          break;
        case "payment_intent.payment_failed":
          await handlePaymentIntentFailed(event.data);
          break;
        case "account.updated":
          await handleAccountUpdated(event.data);
          break;
        default:
          // Unhandled event type — acknowledge receipt
          break;
      }
    } catch (handlerError) {
      console.error(`Error handling ${event.type}:`, handlerError);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    const isSignatureError =
      error instanceof Error &&
      error.message.includes("signature");
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: isSignatureError ? 401 : 400 }
    );
  }
}
