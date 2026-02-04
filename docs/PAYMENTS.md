# Payment System (Future Implementation)

This document outlines the planned payment system for handling rent collection and landlord payouts.

## Fee Structure

| Item | Amount |
|------|--------|
| Platform Fee | 15% |
| Landlord Receives | 85% |

The platform takes a 15% fee on all rent payments. The remaining 85% is transferred to the landlord's connected Stripe account.

## Payment Flow

1. **Tenant Application Approved**
   - Landlord approves a tenancy application
   - Tenant receives invitation to complete onboarding

2. **Tenant Payment Setup**
   - During onboarding, tenant adds a payment method via Stripe
   - Card details are securely stored by Stripe (PCI compliant)
   - Tenant authorizes recurring payments

3. **Monthly Billing Cycle**
   - On the rent due date (configurable per lease)
   - Stripe automatically charges the tenant's payment method
   - Platform deducts 15% fee
   - Remaining 85% queued for landlord payout

4. **Landlord Payouts**
   - Landlord receives payout to their connected Stripe account
   - Payout timing depends on Stripe account settings (typically 2-7 business days)

## Required Schema Additions

The following fields need to be added to support payments:

### `user` table
```typescript
stripeConnectedAccountId: varchar("stripe_connected_account_id", { length: 256 }),
// For landlords to receive payouts
```

### `leases` table
```typescript
stripeSubscriptionId: varchar("stripe_subscription_id", { length: 256 }),
// Links to Stripe Subscription for recurring billing

platformFeePercent: integer("platform_fee_percent").default(15),
// Allows for custom fee arrangements if needed
```

### `payments` table
```typescript
stripeFee: decimal("stripe_fee", { precision: 10, scale: 2 }),
// Stripe's processing fee

platformFee: decimal("platform_fee", { precision: 10, scale: 2 }),
// Our platform's fee (15%)

landlordPayout: decimal("landlord_payout", { precision: 10, scale: 2 }),
// Net amount paid to landlord

stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 256 }),
// Reference to Stripe Payment Intent

stripeTransferId: varchar("stripe_transfer_id", { length: 256 }),
// Reference to Stripe Transfer (payout to landlord)
```

## Stripe Integration Points

### 1. Stripe Connect (for landlords)

Landlords need to onboard to Stripe Connect to receive payouts.

```typescript
// Create connected account
const account = await stripe.accounts.create({
  type: 'express', // or 'standard' for more control
  country: 'US',
  email: landlord.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
});

// Generate onboarding link
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${baseUrl}/landlord/stripe/refresh`,
  return_url: `${baseUrl}/landlord/stripe/complete`,
  type: 'account_onboarding',
});
```

### 2. Stripe Subscriptions (for recurring rent)

Use Stripe Subscriptions for automated monthly billing.

```typescript
// Create subscription when lease starts
const subscription = await stripe.subscriptions.create({
  customer: tenant.stripeCustomerId,
  items: [{
    price_data: {
      currency: lease.currency.toLowerCase(),
      product: 'prod_rent_payment',
      unit_amount: Math.round(lease.monthlyRent * 100),
      recurring: { interval: 'month' },
    },
  }],
  billing_cycle_anchor: getNextRentDueDate(lease.rentDueDay),
  transfer_data: {
    destination: landlord.stripeConnectedAccountId,
    amount: Math.round(lease.monthlyRent * 0.85 * 100), // 85% to landlord
  },
  application_fee_percent: 15, // Platform takes 15%
});
```

### 3. Stripe Payment Intents (for one-time payments)

Use Payment Intents for security deposits and one-time charges.

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: depositAmount,
  currency: lease.currency.toLowerCase(),
  customer: tenant.stripeCustomerId,
  transfer_data: {
    destination: landlord.stripeConnectedAccountId,
  },
  application_fee_amount: Math.round(depositAmount * 0.15),
});
```

## Implementation Order

### Phase 1: Landlord Onboarding
1. Add Stripe Connect integration to landlord settings
2. Create onboarding flow for landlords to connect their bank accounts
3. Store `stripeConnectedAccountId` in user table
4. Add verification status indicators in dashboard

### Phase 2: Tenant Payment Setup
1. Integrate Stripe Elements for secure card input
2. Create customer records in Stripe for tenants
3. Store payment methods securely
4. Add payment method management UI

### Phase 3: Subscription Creation
1. When lease is created after tenant onboarding, create Stripe Subscription
2. Handle subscription lifecycle events via webhooks
3. Store subscription IDs in lease records

### Phase 4: Automated Monthly Billing
1. Configure Stripe webhook handlers for:
   - `invoice.paid` - Record successful payment
   - `invoice.payment_failed` - Handle failed payments
   - `customer.subscription.updated` - Track subscription changes
2. Create payment records in database
3. Send payment confirmations via email

### Phase 5: Landlord Payouts
1. Configure automatic payouts to connected accounts
2. Create payout history/reporting for landlords
3. Handle payout failures and retries

## Webhook Events to Handle

| Event | Action |
|-------|--------|
| `invoice.paid` | Create payment record, mark as completed |
| `invoice.payment_failed` | Create failed payment record, notify tenant |
| `customer.subscription.deleted` | Update lease status |
| `transfer.created` | Record landlord payout |
| `transfer.failed` | Alert landlord, retry payout |
| `account.updated` | Update landlord verification status |

## Security Considerations

1. **PCI Compliance**: Never store raw card numbers. Use Stripe Elements.
2. **Authentication**: All payment endpoints require authentication.
3. **Authorization**: Verify user owns the resource before payment actions.
4. **Webhooks**: Verify Stripe webhook signatures.
5. **Idempotency**: Use idempotency keys for all Stripe API calls.

## Testing

Use Stripe test mode for development:
- Test card: `4242 4242 4242 4242`
- Test bank: Use Stripe test bank accounts
- Webhook testing: Use Stripe CLI for local webhook testing

## Environment Variables Required

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...
```

## API Endpoints (Planned)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/landlord/stripe/connect` | GET | Get Stripe Connect onboarding link |
| `/api/landlord/stripe/status` | GET | Get landlord's Stripe account status |
| `/api/tenant/payment-methods` | GET | List tenant's saved payment methods |
| `/api/tenant/payment-methods` | POST | Add a new payment method |
| `/api/tenant/payment-methods/[id]` | DELETE | Remove a payment method |
| `/api/webhooks/stripe` | POST | Handle Stripe webhooks |
