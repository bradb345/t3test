"use client";

import { CreditCard, Clock, Info, CheckCircle2 } from "lucide-react";
import { PLATFORM_FEE_PERCENT, getPlatformFee, getLandlordPayout } from "~/lib/fees";
import { isOnlinePaymentSupported } from "~/lib/payments";

interface PaymentSetupStepProps {
  monthlyRent: string;
  currency: string;
}

export function PaymentSetupStep({
  monthlyRent,
  currency,
}: PaymentSetupStepProps) {
  const rentAmount = parseFloat(monthlyRent);
  const platformFee = getPlatformFee(rentAmount);
  const landlordPayout = getLandlordPayout(rentAmount);
  const onlineSupported = isOnlinePaymentSupported(currency);

  return (
    <div className="space-y-6">
      {/* Informational message */}
      {!onlineSupported ? (
        <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center dark:border-amber-600 dark:bg-amber-900/20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">
            Payment Setup - Coming Soon
          </h3>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Online payment is not yet supported for {currency} properties.
            For now, you can proceed with your application.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-6 text-center dark:border-blue-600 dark:bg-blue-900/20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-800">
            <CheckCircle2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">
            Secure Stripe Checkout
          </h3>
          <p className="mt-2 text-sm text-blue-700 dark:text-blue-400">
            Payment will be handled securely via Stripe Checkout after your lease is approved.
            No card details are needed at this step.
          </p>
        </div>
      )}

      {/* Payment Info Preview */}
      <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            Payment Details
          </h4>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              Monthly Payment
            </span>
            <span className="font-bold text-primary">
              {currency} {rentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="border-t pt-3 dark:border-gray-700 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Platform Fee ({PLATFORM_FEE_PERCENT}%)
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {currency} {platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Landlord Receives
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {currency} {landlordPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="flex gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-medium">How payments work:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Secure payments via Stripe Checkout</li>
            <li>Pay monthly from your tenant dashboard</li>
            <li>Payment confirmations sent to your email</li>
            <li>Landlord receives {100 - PLATFORM_FEE_PERCENT}% of rent directly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
