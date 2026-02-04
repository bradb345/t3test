"use client";

import { CreditCard, Clock, Info } from "lucide-react";

interface PaymentSetupStepProps {
  monthlyRent: string;
  currency: string;
}

export function PaymentSetupStep({ monthlyRent, currency }: PaymentSetupStepProps) {
  // Calculate platform fee (15%)
  const rentAmount = parseFloat(monthlyRent);
  const platformFee = rentAmount * 0.15;

  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center dark:border-amber-600 dark:bg-amber-900/20">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800">
          <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">
          Payment Setup - Coming Soon
        </h3>
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
          Automatic payment setup will be available soon. For now, you can
          proceed with your application.
        </p>
      </div>

      {/* Payment Info Preview */}
      <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            Future Payment Details
          </h4>
        </div>

        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Once your application is approved, you&apos;ll be able to set up automatic
          monthly payments. Here&apos;s what to expect:
        </p>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Monthly Rent</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {currency} {rentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Platform Fee (15%)
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {currency} {platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="border-t pt-3 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Total Monthly Payment
              </span>
              <span className="font-bold text-primary">
                {currency} {(rentAmount + platformFee).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="flex gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-medium">How payments will work:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Secure payments via Stripe</li>
            <li>Automatic monthly billing on your chosen date</li>
            <li>Payment confirmations sent to your email</li>
            <li>Landlord receives 85% of rent directly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
