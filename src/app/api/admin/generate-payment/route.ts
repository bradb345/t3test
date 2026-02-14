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

    let dueDate: Date;
    if (now.getDate() <= dueDay) {
      dueDate = new Date(year, month, dueDay);
    } else {
      dueDate = new Date(year, month + 1, dueDay);
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
