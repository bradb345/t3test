import { db } from "~/server/db";
import { leases, payments, user } from "~/server/db/schema";
import { and, inArray } from "drizzle-orm";
import { sendAppEmail } from "~/lib/emails/server";
import { createAndEmitNotification } from "~/server/notification-emitter";

const DAYS_BEFORE_DUE = 7;

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function calculateDueDate(rentDueDay: number, today: Date): Date | null {
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

export async function generateRentPayments(): Promise<{
  created: number;
  message?: string;
}> {
  const today = new Date();

  // Fetch all active leases
  const activeLeases = await db
    .select()
    .from(leases)
    .where(inArray(leases.status, ["active", "notice_given"]));

  if (activeLeases.length === 0) {
    return { created: 0, message: "No active leases found" };
  }

  // Determine which leases have a due date within the billing window
  const candidateLeases: {
    lease: (typeof activeLeases)[number];
    dueDate: Date;
  }[] = [];
  for (const lease of activeLeases) {
    const dueDate = calculateDueDate(lease.rentDueDay, today);
    if (dueDate) {
      candidateLeases.push({ lease, dueDate });
    }
  }

  if (candidateLeases.length === 0) {
    return { created: 0, message: "No leases due within billing window" };
  }

  // Batch-fetch existing payments for all candidate leases to avoid N+1
  const candidateLeaseIds = candidateLeases.map((c) => c.lease.id);
  const existingPayments = await db
    .select({
      leaseId: payments.leaseId,
      dueDate: payments.dueDate,
      type: payments.type,
    })
    .from(payments)
    .where(
      and(
        inArray(payments.leaseId, candidateLeaseIds),
        inArray(payments.type, ["rent", "move_in"]),
      ),
    );

  // Build a set of existing "leaseId:year-month" keys for rent payments
  const existingRentKeys = new Set(
    existingPayments
      .filter((p) => p.type === "rent")
      .map((p) => {
        const d = new Date(p.dueDate);
        return `${p.leaseId}:${d.getFullYear()}-${d.getMonth()}`;
      }),
  );

  // Build a set of "leaseId:year-month" keys for move_in payments.
  // A move_in payment covers first month's rent, so any rent due date
  // in the same month as a move_in payment is already paid.
  const moveInMonthKeys = new Set(
    existingPayments
      .filter((p) => p.type === "move_in")
      .map((p) => {
        const d = new Date(p.dueDate);
        return `${p.leaseId}:${d.getFullYear()}-${d.getMonth()}`;
      }),
  );

  // Filter to only leases that don't already have a payment for this due date
  const toInsert = candidateLeases.filter(({ lease, dueDate }) => {
    const rentKey = `${lease.id}:${dueDate.getFullYear()}-${dueDate.getMonth()}`;
    if (existingRentKeys.has(rentKey)) return false;

    // Skip if a move_in payment already covers this month's rent
    const moveInKey = `${lease.id}:${dueDate.getFullYear()}-${dueDate.getMonth()}`;
    if (moveInMonthKeys.has(moveInKey)) return false;

    return true;
  });

  if (toInsert.length === 0) {
    return { created: 0, message: "All due payments already exist" };
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

  // Send email and in-app notification for each new payment
  try {
    const tenantIds = [
      ...new Set(toInsert.map(({ lease }) => lease.tenantId)),
    ];
    const tenants = await db
      .select({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
      })
      .from(user)
      .where(inArray(user.id, tenantIds));
    const tenantMap = new Map(tenants.map((t) => [t.id, t]));

    await Promise.allSettled(
      toInsert.map(async ({ lease, dueDate }) => {
        const tenant = tenantMap.get(lease.tenantId);
        if (!tenant) return;

        const formattedAmount = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: lease.currency,
        }).format(parseFloat(lease.monthlyRent));
        const formattedDueDate = dueDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        await sendAppEmail(tenant.email, "payment_reminder", {
          tenantName: tenant.firstName,
          amount: lease.monthlyRent,
          currency: lease.currency,
          dueDate: formattedDueDate,
        });

        await createAndEmitNotification({
          userId: tenant.id,
          type: "payment_reminder",
          title: "Rent Payment Due Soon",
          message: `Your rent payment of ${formattedAmount} is due on ${formattedDueDate}.`,
        });
      }),
    );
  } catch (error) {
    console.error("Error sending payment reminder notifications:", error);
  }

  return { created: newPayments.length };
}
