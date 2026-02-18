import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { env } from "~/env";

let stripePromise: Promise<Stripe | null> | null = null;

/** Returns a lazily-loaded, cached Stripe.js instance. */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}
