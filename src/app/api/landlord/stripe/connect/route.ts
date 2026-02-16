import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { env } from "~/env";
import { getAuthenticatedLandlord } from "~/server/auth";
import { getPaymentProvider } from "~/lib/payments";

export async function POST() {
  try {
    const auth = await getAuthenticatedLandlord();
    if (auth.error) return auth.error;

    const dbUser = auth.user;
    const provider = getPaymentProvider();
    const isTestMode = env.STRIPE_SECRET_KEY.startsWith("sk_test_");

    const baseUrl = env.NEXT_PUBLIC_APP_URL;
    const refreshUrl = `${baseUrl}/my-properties?tab=financials&stripe=refresh`;
    const returnUrl = `${baseUrl}/my-properties?tab=financials&stripe=complete`;

    // If they already have an account, check status or resume onboarding
    if (dbUser.stripeConnectedAccountId) {
      // In test mode with Custom accounts, check if already complete
      const status = await provider.getConnectedAccount(
        dbUser.stripeConnectedAccountId
      );
      if (status.onboardingComplete) {
        // Already done — update DB and return
        await db
          .update(user)
          .set({ stripeConnectedAccountStatus: "complete" })
          .where(eq(user.id, dbUser.id));
        return NextResponse.json({ complete: true });
      }

      // Express accounts need an onboarding link to resume
      if (!isTestMode) {
        const url = await provider.getOnboardingLink({
          accountId: dbUser.stripeConnectedAccountId,
          refreshUrl,
          returnUrl,
        });
        return NextResponse.json({ url });
      }

      // Test mode Custom account that isn't complete yet — shouldn't
      // happen since we pre-fill, but return complete anyway
      return NextResponse.json({ complete: true });
    }

    // Create a new connected account
    const accountId = await provider.createConnectedAccount({
      email: dbUser.email,
      country: "US",
    });

    // Check if the account is already fully onboarded (test mode Custom accounts)
    const status = await provider.getConnectedAccount(accountId);
    const accountStatus = status.onboardingComplete ? "complete" : "pending";

    // Save the account ID and status
    await db
      .update(user)
      .set({
        stripeConnectedAccountId: accountId,
        stripeConnectedAccountStatus: accountStatus,
      })
      .where(eq(user.id, dbUser.id));

    // If already complete (test mode), no redirect needed
    if (status.onboardingComplete) {
      return NextResponse.json({ complete: true });
    }

    // Production: generate onboarding link for Express account
    const url = await provider.getOnboardingLink({
      accountId,
      refreshUrl,
      returnUrl,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return NextResponse.json(
      { error: "Failed to set up Stripe Connect" },
      { status: 500 }
    );
  }
}
