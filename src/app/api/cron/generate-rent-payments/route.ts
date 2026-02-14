import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { leases, payments } from "~/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { env } from "~/env";

const DAYS_BEFORE_DUE = 7;

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function calculateDueDate(
  rentDueDay: number,
  today: Date,
): Date | null {
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDay = today.getDate();

  // Clamp rentDueDay to last day of current month
  const daysInCurrentMonth = getDaysInMonth(year, month);
  const clampedDayCurrentMonth = Math.min(rentDueDay, daysInCurrentMonth);

  // Check if due date this month is within the billing window
  const daysUntilDueThisMonth = clampedDayCurrentMonth - todayDay;
  if (daysUntilDueThisMonth >= 0 && daysUntilDueThisMonth <= DAYS_BEFORE_DUE) {
    return new Date(year, month, clampedDayCurrentMonth);
  }

  // Check if due date next month is within the billing window
  const nextMonth = month + 1;
  const nextMonthYear = nextMonth > 11 ? year + 1 : year;
  const nextMonthNormalized = nextMonth > 11 ? 0 : nextMonth;
  const daysInNextMonth = getDaysInMonth(nextMonthYear, nextMonthNormalized);
  const clampedDayNextMonth = Math.min(rentDueDay, daysInNextMonth);

  const daysUntilDueNextMonth =
    getDaysInMonth(year, month) - todayDay + clampedDayNextMonth;
  if (daysUntilDueNextMonth >= 0 && daysUntilDueNextMonth <= DAYS_BEFORE_DUE) {
    return new Date(nextMonthYear, nextMonthNormalized, clampedDayNextMonth);
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();

    // Fetch all active leases
    const activeLeases = await db
      .select()
      .from(leases)
      .where(inArray(leases.status, ["active", "notice_given"]));

    if (activeLeases.length === 0) {
      return NextResponse.json({ created: 0, message: "No active leases found" });
    }

    // Determine which leases have a due date within the billing window
    const candidateLeases: { lease: typeof activeLeases[number]; dueDate: Date }[] = [];
    for (const lease of activeLeases) {
      const dueDate = calculateDueDate(lease.rentDueDay, today);
      if (dueDate) {
        candidateLeases.push({ lease, dueDate });
      }
    }

    if (candidateLeases.length === 0) {
      return NextResponse.json({ created: 0, message: "No leases due within billing window" });
    }

    // Batch-fetch existing payments for all candidate leases to avoid N+1
    const candidateLeaseIds = candidateLeases.map((c) => c.lease.id);
    const existingPayments = await db
      .select({
        leaseId: payments.leaseId,
        dueDate: payments.dueDate,
      })
      .from(payments)
      .where(
        and(
          inArray(payments.leaseId, candidateLeaseIds),
          eq(payments.type, "rent"),
        ),
      );

    // Build a set of existing "leaseId:dueDate" keys for fast lookup
    const existingKeys = new Set(
      existingPayments.map((p) => {
        const d = new Date(p.dueDate);
        return `${p.leaseId}:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
    );

    // Filter to only leases that don't already have a payment for this due date
    const toInsert = candidateLeases.filter(({ lease, dueDate }) => {
      const key = `${lease.id}:${dueDate.getFullYear()}-${dueDate.getMonth()}-${dueDate.getDate()}`;
      return !existingKeys.has(key);
    });

    if (toInsert.length === 0) {
      return NextResponse.json({ created: 0, message: "All due payments already exist" });
    }

    // Batch insert all new payments
    const newPayments = await db
      .insert(payments)
      .values(
        toInsert.map(({ lease, dueDate }) => ({
          tenantId: lease.tenantId,
          leaseId: lease.id,
          amount: lease.monthlyRent,
          currency: lease.currency,
          type: "rent",
          status: "pending",
          dueDate,
        })),
      )
      .returning({ id: payments.id, leaseId: payments.leaseId });

    return NextResponse.json({
      created: newPayments.length,
      payments: newPayments,
    });
  } catch (error) {
    console.error("Error generating rent payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
