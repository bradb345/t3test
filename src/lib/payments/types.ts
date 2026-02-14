/**
 * Payment provider abstraction types.
 *
 * Defines a provider-agnostic interface for payment processing.
 * Implementations exist for Stripe (USD) with room for future
 * providers (e.g., KYD-capable processors).
 */

export interface CreateCustomerParams {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface CreateConnectedAccountParams {
  email: string;
  country: string;
  businessType?: "individual" | "company";
}

export interface GetOnboardingLinkParams {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}

export interface CheckoutLineItem {
  name: string;
  amountCents: number;
}

export interface CreateCheckoutSessionParams {
  amountCents: number;
  currency: string;
  customerId: string;
  connectedAccountId: string;
  applicationFeeCents: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  /** Optional line items for multi-item checkout (e.g. move-in: rent + deposit). */
  lineItems?: CheckoutLineItem[];
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
}

export interface CreatePaymentIntentParams {
  amountCents: number;
  currency: string;
  customerId: string;
  paymentMethodId: string;
  connectedAccountId: string;
  applicationFeeCents: number;
  metadata?: Record<string, string>;
}

export interface ConnectedAccountStatus {
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  onboardingComplete: boolean;
}

export interface PaymentIntentResult {
  id: string;
  status: string;
  clientSecret: string | null;
}

export interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

/** JSON shape stored in the payment `notes` field for move-in payments. */
export interface MoveInPaymentNotes {
  rentAmount: string;
  securityDeposit: string;
}

/** Parse a move-in payment's notes JSON. Returns null if invalid or not move-in. */
export function parseMoveInNotes(notes: string | null): MoveInPaymentNotes | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>;
    if (typeof parsed.rentAmount === "string" && typeof parsed.securityDeposit === "string") {
      return { rentAmount: parsed.rentAmount, securityDeposit: parsed.securityDeposit };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Provider-agnostic payment interface.
 *
 * Each method maps to a payment platform capability.
 * The Stripe implementation is the primary one; additional
 * providers can be added by implementing this interface.
 */
export interface PaymentProvider {
  /** Create a customer record for a tenant. */
  createCustomer(params: CreateCustomerParams): Promise<string>;

  /** Create a connected/express account for a landlord. */
  createConnectedAccount(params: CreateConnectedAccountParams): Promise<string>;

  /** Retrieve the status of a connected account. */
  getConnectedAccount(accountId: string): Promise<ConnectedAccountStatus>;

  /** Generate an onboarding link for a connected account. */
  getOnboardingLink(params: GetOnboardingLinkParams): Promise<string>;

  /** Create a Checkout Session for a one-time rent payment. */
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult>;

  /** Create a PaymentIntent to charge a tenant. */
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;

  /** Retrieve an existing PaymentIntent. */
  getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult>;

  /** Verify and parse a webhook event from the raw body + signature. */
  constructWebhookEvent(body: string, signature: string): WebhookEvent;
}
