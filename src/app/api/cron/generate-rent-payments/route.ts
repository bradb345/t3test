import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { generateRentPayments } from "~/lib/cron/generate-rent-payments";
import { checkOverduePayments } from "~/lib/cron/check-overdue-payments";

export async function GET(request: NextRequest) {
  try {
    // Verify authorization via Bearer token
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run both tasks concurrently — one failing doesn't block the other
    const [generateResult, overdueResult] = await Promise.allSettled([
      generateRentPayments(),
      checkOverduePayments(),
    ]);

    return NextResponse.json({
      generatePayments:
        generateResult.status === "fulfilled"
          ? generateResult.value
          : { error: String(generateResult.reason) },
      checkOverdue:
        overdueResult.status === "fulfilled"
          ? overdueResult.value
          : { error: String(overdueResult.reason) },
    });
  } catch (error) {
    console.error("Error in daily payment cron:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
