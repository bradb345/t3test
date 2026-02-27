import { db } from "~/server/db";
import { leases, payments, user, units, properties } from "~/server/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { sendAppEmail } from "~/lib/emails/server";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { GRACE_PERIOD_DAYS } from "~/lib/payments/constants";

export async function checkOverduePayments(): Promise<{
  updated: number;
  message?: string;
  leaseIds?: number[];
}> {
  // Find all non-delinquent active/notice_given leases that have overdue payments
  // A payment is overdue if status is pending/failed AND dueDate + grace period < now
  const overdueLeases = await db
    .select({
      leaseId: leases.id,
      tenantId: leases.tenantId,
      landlordId: leases.landlordId,
      unitId: leases.unitId,
      currency: leases.currency,
      overdueAmount: payments.amount,
      overdueDueDate: payments.dueDate,
    })
    .from(leases)
    .innerJoin(
      payments,
      and(
        eq(payments.leaseId, leases.id),
        inArray(payments.status, ["pending", "failed"]),
        sql`${payments.dueDate} + (${GRACE_PERIOD_DAYS} * interval '1 day') < now()`
      )
    )
    .where(
      and(
        eq(leases.delinquent, false),
        inArray(leases.status, ["active", "notice_given"])
      )
    );

  if (overdueLeases.length === 0) {
    return { updated: 0, message: "No newly delinquent leases found" };
  }

  // Deduplicate by leaseId — pick the earliest overdue payment for each lease
  const leaseMap = new Map<
    number,
    {
      tenantId: number;
      landlordId: number;
      unitId: number;
      currency: string;
      amount: string;
      dueDate: Date;
    }
  >();
  for (const row of overdueLeases) {
    const existing = leaseMap.get(row.leaseId);
    if (!existing || row.overdueDueDate < existing.dueDate) {
      leaseMap.set(row.leaseId, {
        tenantId: row.tenantId,
        landlordId: row.landlordId,
        unitId: row.unitId,
        currency: row.currency,
        amount: row.overdueAmount,
        dueDate: row.overdueDueDate,
      });
    }
  }

  const delinquentLeaseIds = [...leaseMap.keys()];

  // Batch update all newly delinquent leases
  await db
    .update(leases)
    .set({ delinquent: true })
    .where(inArray(leases.id, delinquentLeaseIds));

  // Batch-fetch user details for tenants and landlords
  const allUserIds = [
    ...new Set([
      ...[...leaseMap.values()].map((l) => l.tenantId),
      ...[...leaseMap.values()].map((l) => l.landlordId),
    ]),
  ];
  const userDetails = await db
    .select({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    })
    .from(user)
    .where(inArray(user.id, allUserIds));
  const userMap = new Map(userDetails.map((u) => [u.id, u]));

  // Batch-fetch unit + property details
  const allUnitIds = [
    ...new Set([...leaseMap.values()].map((l) => l.unitId)),
  ];
  const unitDetails = await db
    .select({
      unitId: units.id,
      unitNumber: units.unitNumber,
      propertyName: properties.name,
    })
    .from(units)
    .innerJoin(properties, eq(properties.id, units.propertyId))
    .where(inArray(units.id, allUnitIds));
  const unitMap = new Map(unitDetails.map((u) => [u.unitId, u]));

  // Send notifications and emails
  await Promise.allSettled(
    [...leaseMap.entries()].map(async ([leaseId, data]) => {
      const tenant = userMap.get(data.tenantId);
      const landlord = userMap.get(data.landlordId);
      const unit = unitMap.get(data.unitId);

      const formattedAmount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: data.currency,
      }).format(parseFloat(data.amount));

      const formattedDueDate = data.dueDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      // Notify tenant
      if (tenant) {
        await createAndEmitNotification({
          userId: tenant.id,
          type: "payment_overdue",
          title: "Payment Overdue — Dashboard Restricted",
          message: `Your rent payment of ${formattedAmount} due on ${formattedDueDate} is overdue. Your dashboard access has been restricted until payment is made.`,
          data: JSON.stringify({
            leaseId,
            amount: data.amount,
            currency: data.currency,
          }),
        });

        try {
          await sendAppEmail(tenant.email, "payment_overdue", {
            tenantName: tenant.firstName,
            amount: data.amount,
            currency: data.currency,
            dueDate: formattedDueDate,
            gracePeriodDays: GRACE_PERIOD_DAYS,
          });
        } catch (error) {
          console.error(
            `Failed to send overdue email to tenant ${tenant.id}:`,
            error
          );
        }
      }

      // Notify landlord
      if (landlord && tenant && unit) {
        await createAndEmitNotification({
          userId: landlord.id,
          type: "payment_overdue_landlord",
          title: "Tenant Payment Overdue",
          message: `${tenant.firstName} ${tenant.lastName} at Unit ${unit.unitNumber} has an overdue rent payment of ${formattedAmount} (due ${formattedDueDate}).`,
          data: JSON.stringify({
            leaseId,
            tenantId: tenant.id,
            amount: data.amount,
            currency: data.currency,
          }),
        });

        try {
          await sendAppEmail(landlord.email, "payment_overdue_landlord", {
            landlordName: landlord.firstName,
            tenantName: `${tenant.firstName} ${tenant.lastName}`,
            amount: data.amount,
            currency: data.currency,
            dueDate: formattedDueDate,
            unitNumber: unit.unitNumber,
            propertyName: unit.propertyName,
          });
        } catch (error) {
          console.error(
            `Failed to send overdue email to landlord ${landlord.id}:`,
            error
          );
        }
      }
    })
  );

  return { updated: delinquentLeaseIds.length, leaseIds: delinquentLeaseIds };
}
