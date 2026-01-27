"use client";

import { StatsCards } from "./StatsCards";
import { PendingMaintenanceCard } from "./PendingMaintenanceCard";
import { LeaseExpirationsCard } from "./LeaseExpirationsCard";
import { QuickActionsCard } from "./QuickActionsCard";
import type {
  LandlordStats,
  LeaseExpiration,
  MaintenanceRequestWithDetails
} from "~/types/landlord";

interface OverviewTabProps {
  stats: LandlordStats;
  leaseExpirations: LeaseExpiration[];
  maintenanceRequests: MaintenanceRequestWithDetails[];
  onTabChange: (tab: string) => void;
  onInviteTenant: () => void;
}

export function OverviewTab({
  stats,
  leaseExpirations,
  maintenanceRequests,
  onTabChange,
  onInviteTenant,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <StatsCards stats={stats} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <PendingMaintenanceCard
          requests={maintenanceRequests}
          onViewAll={() => onTabChange("maintenance")}
        />
        <LeaseExpirationsCard
          expirations={leaseExpirations}
          onViewTenants={() => onTabChange("tenants")}
        />
        <QuickActionsCard onInviteTenant={onInviteTenant} />
      </div>
    </div>
  );
}
