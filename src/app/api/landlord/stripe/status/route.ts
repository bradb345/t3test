import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedLandlord } from "~/server/auth";
import { getPaymentProvider } from "~/lib/payments";

export async function GET() {
  try {
    const auth = await getAuthenticatedLandlord();
    if (auth.error) return auth.error;

    const dbUser = auth.user;

    if (!dbUser.stripeConnectedAccountId) {
      return NextResponse.json({
        connected: false,
        payoutsEnabled: false,
        chargesEnabled: false,
        onboardingComplete: false,
      });
    }

    const provider = getPaymentProvider();
    const status = await provider.getConnectedAccount(
      dbUser.stripeConnectedAccountId
    );

    // Sync status back to DB if onboarding just completed
    if (
      status.onboardingComplete &&
      dbUser.stripeConnectedAccountStatus !== "complete"
    ) {
      await db
        .update(user)
        .set({ stripeConnectedAccountStatus: "complete" })
        .where(eq(user.id, dbUser.id));
    }

    return NextResponse.json({
      connected: true,
      ...status,
    });
  } catch (error) {
    console.error("Stripe status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Stripe status" },
      { status: 500 }
    );
  }
}
