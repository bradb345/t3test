import Stripe from "stripe";
import { env } from "~/env";
import type {
  PaymentProvider,
  CreateCustomerParams,
  CreateConnectedAccountParams,
  GetOnboardingLinkParams,
  CreateCheckoutSessionParams,
  CreatePaymentIntentParams,
  ConnectedAccountStatus,
  CheckoutSessionResult,
  PaymentIntentResult,
  WebhookEvent,
} from "./types";

function getStripeInstance(): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-01-28.clover",
    typescript: true,
  });
}

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor() {
    this.stripe = getStripeInstance();
  }

  async createCustomer(params: CreateCustomerParams): Promise<string> {
    const customer = await this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata,
    });
    return customer.id;
  }

  async createConnectedAccount(
    params: CreateConnectedAccountParams
  ): Promise<string> {
    const isTestMode = env.STRIPE_SECRET_KEY.startsWith("sk_test_");

    if (isTestMode) {
      // In test mode, create a Custom account with pre-filled info
      // so we don't need the Stripe-hosted onboarding UI (which is
      // unreliable in test mode).
      const account = await this.stripe.accounts.create({
        type: "custom",
        country: params.country,
        email: params.email,
        business_type: params.businessType ?? "individual",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        individual: {
          first_name: "Test",
          last_name: "Landlord",
          dob: { day: 1, month: 1, year: 1990 },
          address: {
            line1: "123 Test St",
            city: "New York",
            state: "NY",
            postal_code: "10001",
          },
          ssn_last_4: "0000",
        },
        business_profile: {
          url: "https://example-landlord.com",
          mcc: "6513", // Real estate agents and managers
        },
        external_account: {
          object: "bank_account" as const,
          country: "US",
          currency: "usd",
          routing_number: "110000000",
          account_number: "000123456789",
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: "127.0.0.1",
        },
      });
      return account.id;
    }

    // Production: create an Express account with Stripe-hosted onboarding
    const account = await this.stripe.accounts.create({
      type: "express",
      country: params.country,
      email: params.email,
      business_type: params.businessType ?? "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    return account.id;
  }

  async getConnectedAccount(accountId: string): Promise<ConnectedAccountStatus> {
    const account = await this.stripe.accounts.retrieve(accountId);
    return {
      payoutsEnabled: account.payouts_enabled ?? false,
      chargesEnabled: account.charges_enabled ?? false,
      onboardingComplete:
        (account.payouts_enabled ?? false) && (account.charges_enabled ?? false),
    };
  }

  async getOnboardingLink(params: GetOnboardingLinkParams): Promise<string> {
    const link = await this.stripe.accountLinks.create({
      account: params.accountId,
      refresh_url: params.refreshUrl,
      return_url: params.returnUrl,
      type: "account_onboarding",
    });
    return link.url;
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<CheckoutSessionResult> {
    const stripeLineItems = params.lineItems
      ? params.lineItems.map((item) => ({
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: { name: item.name },
            unit_amount: item.amountCents,
          },
          quantity: 1,
        }))
      : [
          {
            price_data: {
              currency: params.currency.toLowerCase(),
              product_data: { name: "Rent Payment" },
              unit_amount: params.amountCents,
            },
            quantity: 1,
          },
        ];

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer: params.customerId,
      line_items: stripeLineItems,
      payment_intent_data: {
        application_fee_amount: params.applicationFeeCents,
        transfer_data: {
          destination: params.connectedAccountId,
        },
        metadata: params.metadata,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    });
    return {
      id: session.id,
      url: session.url!,
    };
  }

  async createPaymentIntent(
    params: CreatePaymentIntentParams
  ): Promise<PaymentIntentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: params.amountCents,
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      payment_method: params.paymentMethodId,
      application_fee_amount: params.applicationFeeCents,
      transfer_data: {
        destination: params.connectedAccountId,
      },
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: params.metadata,
    });
    return {
      id: intent.id,
      status: intent.status,
      clientSecret: intent.client_secret,
    };
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult> {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      id: intent.id,
      status: intent.status,
      clientSecret: intent.client_secret,
    };
  }

  constructWebhookEvent(body: string, signature: string): WebhookEvent {
    const event = this.stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
    return {
      type: event.type,
      data: event.data.object as unknown as Record<string, unknown>,
    };
  }
}
