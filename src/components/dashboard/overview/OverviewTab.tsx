"use client";

import { LeaseInfoCard } from "./LeaseInfoCard";
import { NextPaymentCard } from "./NextPaymentCard";
import { RecentMaintenanceCard } from "./RecentMaintenanceCard";
import { QuickActionsCard } from "./QuickActionsCard";
import { OffboardingBanner } from "./OffboardingBanner";
import type {
  leases,
  units,
  properties,
  payments,
  maintenanceRequests,
  tenantOffboardingNotices,
} from "~/server/db/schema";

type Lease = typeof leases.$inferSelect;
type Unit = typeof units.$inferSelect;
type Property = typeof properties.$inferSelect;
type Payment = typeof payments.$inferSelect;
type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
type OffboardingNotice = typeof tenantOffboardingNotices.$inferSelect;

interface LeaseWithDetails {
  lease: Lease;
  unit: Unit;
  property: Property;
}

interface OverviewTabProps {
  lease: LeaseWithDetails;
  payments: Payment[];
  maintenanceRequests: MaintenanceRequest[];
  offboardingNotice: OffboardingNotice | null;
  onOffboardingChange?: () => void;
}

export function OverviewTab({
  lease,
  payments,
  maintenanceRequests,
  offboardingNotice,
  onOffboardingChange,
}: OverviewTabProps) {
  // Find next upcoming payment (pending status, future due date)
  // Move-in payments always surface first, then sorted by due date
  const now = new Date();
  const upcomingPayments = payments
    .filter(
      (p) => p.status === "pending" && new Date(p.dueDate) >= now
    )
    .sort((a, b) => {
      if (a.type === "move_in" && b.type !== "move_in") return -1;
      if (a.type !== "move_in" && b.type === "move_in") return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const nextPayment = upcomingPayments[0] ?? null;

  // Get 3 most recent maintenance requests
  const recentMaintenance = maintenanceRequests.slice(0, 3);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Offboarding Banner - spans full width if active */}
      {offboardingNotice && (
        <OffboardingBanner
          notice={offboardingNotice}
          unitNumber={lease.unit.unitNumber}
          propertyName={lease.property.name}
          onCancelled={onOffboardingChange}
        />
      )}

      <LeaseInfoCard lease={lease} />
      <NextPaymentCard payment={nextPayment} lease={lease} />
      <RecentMaintenanceCard requests={recentMaintenance} />
      <QuickActionsCard />
    </div>
  );
}
