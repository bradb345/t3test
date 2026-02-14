/**
 * Payment provider factory and helpers.
 *
 * - `getPaymentProvider()` returns a singleton PaymentProvider.
 * - `resolveProviderName()` maps a currency to the right provider key.
 * - `isOnlinePaymentSupported()` checks whether the currency can be processed online.
 */

import type { PaymentProvider } from "./types";
import { StripeProvider } from "./stripe-provider";

let providerInstance: PaymentProvider | null = null;

/** Returns the singleton payment provider (Stripe). */
export function getPaymentProvider(): PaymentProvider {
  if (!providerInstance) {
    providerInstance = new StripeProvider();
  }
  return providerInstance;
}

/** Resolve which provider name handles a given currency. */
export function resolveProviderName(currency: string): "stripe" | null {
  const supported = ["USD"];
  if (supported.includes(currency.toUpperCase())) {
    return "stripe";
  }
  return null;
}

/** Whether online payment processing is available for a currency. */
export function isOnlinePaymentSupported(currency: string): boolean {
  return resolveProviderName(currency) !== null;
}

export type { PaymentProvider } from "./types";
