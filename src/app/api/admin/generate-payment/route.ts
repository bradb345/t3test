import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { leases, payments } from "~/server/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { isAdmin } from "~/lib/roles";
import { getAuthenticatedUser } from "~/server/auth";

// POST /api/admin/generate-payment - Admin-only: create a pending rent payment for a tenant
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.error) return authResult.error;
    const dbUser = authResult.user;

    if (!isAdmin(dbUser)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as { tenantId?: number };
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 },
      );
    }

    // Find tenant's active lease
    const [lease] = await db
      .select()
      .from(leases)
      .where(
        and(
          eq(leases.tenantId, tenantId),
          inArray(leases.status, ["active", "notice_given"]),
        ),
      )
      .limit(1);

    if (!lease) {
      return NextResponse.json(
        { error: "No active lease found for this tenant" },
        { status: 404 },
      );
    }

    // Calculate due date: if rentDueDay hasn't passed this month, use this month; otherwise next month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const dueDay = lease.rentDueDay;

    // Clamp dueDay to last day of the target month
    const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

    let dueDate: Date;
    if (now.getDate() <= dueDay) {
      const clampedDay = Math.min(dueDay, daysInMonth(year, month));
      dueDate = new Date(year, month, clampedDay);
    } else {
      const nextMonth = month + 1;
      const nextYear = nextMonth > 11 ? year + 1 : year;
      const nextMonthNorm = nextMonth > 11 ? 0 : nextMonth;
      const clampedDay = Math.min(dueDay, daysInMonth(nextYear, nextMonthNorm));
      dueDate = new Date(nextYear, nextMonthNorm, clampedDay);
    }

    // Check for existing payment with the same due date to prevent duplicates
    const dueDateStr = `${dueDate.getFullYear()}-${dueDate.getMonth()}-${dueDate.getDate()}`;
    const existingPayments = await db
      .select({ id: payments.id, dueDate: payments.dueDate })
      .from(payments)
      .where(
        and(
          eq(payments.leaseId, lease.id),
          eq(payments.type, "rent"),
        ),
      );

    const isDuplicate = existingPayments.some((p) => {
      const d = new Date(p.dueDate);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === dueDateStr;
    });

    if (isDuplicate) {
      return NextResponse.json(
        { error: "A rent payment already exists for this due date" },
        { status: 409 },
      );
    }

    const [payment] = await db
      .insert(payments)
      .values({
        tenantId,
        leaseId: lease.id,
        amount: lease.monthlyRent,
        currency: lease.currency,
        type: "rent",
        status: "pending",
        dueDate,
      })
      .returning();

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error("Error generating payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
