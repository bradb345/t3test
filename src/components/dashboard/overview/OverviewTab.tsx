"use client";

import { LeaseInfoCard } from "./LeaseInfoCard";
import { NextPaymentCard } from "./NextPaymentCard";
import { RecentMaintenanceCard } from "./RecentMaintenanceCard";
import { QuickActionsCard } from "./QuickActionsCard";
import type {
  leases,
  units,
  properties,
  payments,
  maintenanceRequests,
} from "~/server/db/schema";

type Lease = typeof leases.$inferSelect;
type Unit = typeof units.$inferSelect;
type Property = typeof properties.$inferSelect;
type Payment = typeof payments.$inferSelect;
type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;

interface LeaseWithDetails {
  lease: Lease;
  unit: Unit;
  property: Property;
}

interface OverviewTabProps {
  lease: LeaseWithDetails;
  payments: Payment[];
  maintenanceRequests: MaintenanceRequest[];
}

export function OverviewTab({
  lease,
  payments,
  maintenanceRequests,
}: OverviewTabProps) {
  // Find next upcoming payment (pending status, future due date)
  const now = new Date();
  const upcomingPayments = payments
    .filter(
      (p) => p.status === "pending" && new Date(p.dueDate) >= now
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const nextPayment = upcomingPayments[0] ?? null;

  // Get 3 most recent maintenance requests
  const recentMaintenance = maintenanceRequests.slice(0, 3);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <LeaseInfoCard lease={lease} />
      <NextPaymentCard payment={nextPayment} lease={lease} />
      <RecentMaintenanceCard requests={recentMaintenance} />
      <QuickActionsCard />
    </div>
  );
}
