# Payment System

This document describes the payment system for handling rent collection and landlord payouts.

## Architecture

### Provider Abstraction (`src/lib/payments/`)

The payment system uses a provider abstraction to decouple business logic from the payment processor.

| File | Purpose |
|------|---------|
| `types.ts` | `PaymentProvider` interface (~10 methods) |
| `stripe-provider.ts` | Stripe implementation |
| `index.ts` | Singleton factory `getPaymentProvider()`, `isOnlinePaymentSupported()` |
| `client.ts` | Client-side `getStripe()` for Stripe.js |
| `webhook-handlers.ts` | Webhook event processors |

`isOnlinePaymentSupported(currency)` returns `true` for USD only. KYD properties see "Coming Soon" placeholders.

### Payment Intents (not Subscriptions)

Tenants manually initiate each payment via Payment Intents. This avoids Subscription lifecycle complexity when rent amounts change or leases end.

### Stripe Connect (Express Accounts)

Landlords onboard via Stripe-hosted Express account setup. The platform uses `application_fee_amount` + `transfer_data.destination` for the marketplace payment split.

## Fee Structure

The platform fee is **inclusive** — taken from the rent amount, not added on top. Tenants pay exactly the rent set by the landlord.

| Item | Amount | Example ($2,000 rent) |
|------|--------|-----------------------|
| Tenant Pays | 100% of rent | $2,000 |
| Platform Fee | 15% of rent | $300 |
| Landlord Receives | 85% of rent | $1,700 |

Fee calculations are centralized in `src/lib/fees.ts`. All math is done in cents to avoid floating-point issues.

## Payment Flow

1. **Landlord connects Stripe** — `POST /api/landlord/stripe/connect` creates an Express account and redirects to Stripe onboarding.
2. **Tenant saves a card** — `POST /api/tenant/payment-methods` creates a SetupIntent (and Stripe Customer if needed). The client uses Stripe Elements to confirm.
3. **Tenant makes a payment** — `POST /api/tenant/payments` accepts `{ paymentId, paymentMethodId }`, calculates fees, creates a Payment Intent with `application_fee_amount` and `transfer_data.destination`, and sets payment status to "processing".
4. **Webhook confirms** — `POST /api/webhooks/stripe` receives `payment_intent.succeeded` or `payment_intent.payment_failed`, updates the payment record, and creates notifications.

## Schema Additions

### `user` table
- `stripeConnectedAccountId` — Landlord's Stripe Express account ID
- `stripeConnectedAccountStatus` — `null` | `"pending"` | `"complete"`
- `stripeCustomerId` — Tenant's Stripe Customer ID (already existed)

### `payments` table
- `platformFee` — Platform's 15% fee (decimal 10,2)
- `landlordPayout` — Net to landlord (decimal 10,2)
- `stripePaymentIntentId` — Stripe Payment Intent reference
- `stripeTransferId` — Stripe Transfer reference

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/landlord/stripe/connect` | POST | Create/resume Stripe Express onboarding |
| `/api/landlord/stripe/status` | GET | Check Connect account status |
| `/api/tenant/payment-methods` | GET | List saved payment methods |
| `/api/tenant/payment-methods` | POST | Create SetupIntent for adding a card |
| `/api/tenant/payment-methods/[id]` | DELETE | Remove a saved payment method |
| `/api/tenant/payments` | POST | Initiate a rent payment |
| `/api/webhooks/stripe` | POST | Handle Stripe webhook events |

## Webhook Events

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Mark payment completed, notify tenant + landlord |
| `payment_intent.payment_failed` | Mark payment failed, notify tenant |
| `account.updated` | Sync landlord Connect account status |

## UI Components

| Component | Location |
|-----------|----------|
| `StripeProvider` | `src/components/providers/StripeProvider.tsx` |
| `PaymentMethodCard` | `src/components/payments/PaymentMethodCard.tsx` |
| `AddPaymentMethodForm` | `src/components/payments/AddPaymentMethodForm.tsx` |
| `initiateCheckout` | `src/lib/payments/checkout.ts` (shared redirect helper) |
| `StripeConnectCard` | `src/components/landlord-dashboard/financials/StripeConnectCard.tsx` |

## Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Optional for local dev
```

## Testing

Use Stripe test mode:
- Test card: `4242 4242 4242 4242`
- Test webhook: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## Security

1. **PCI Compliance**: Card data handled entirely by Stripe Elements — never touches our server.
2. **Authentication**: All payment endpoints use Clerk auth + role checks.
3. **Authorization**: Payment methods verified to belong to the authenticated user before detach.
4. **Webhooks**: Signature verification via `stripe.webhooks.constructEvent`.
5. **Source of truth**: API sets status to "processing", webhook confirms "completed"/"failed".
