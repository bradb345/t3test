"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Home, Wrench, CreditCard, FileText, User, AlertTriangle } from "lucide-react";
import { OverviewTab } from "./overview/OverviewTab";
import { MaintenanceTab } from "./maintenance/MaintenanceTab";
import { PaymentsTab } from "./payments/PaymentsTab";
import { DocumentsTab } from "./documents/DocumentsTab";
import { ProfileTab } from "./profile/ProfileTab";
import type {
  user,
  leases,
  units,
  properties,
  payments,
  maintenanceRequests,
  tenantProfiles,
  tenantDocuments,
  employmentInfo,
  emergencyContacts,
  tenantOffboardingNotices,
} from "~/server/db/schema";

type User = typeof user.$inferSelect;
type Lease = typeof leases.$inferSelect;
type Unit = typeof units.$inferSelect;
type Property = typeof properties.$inferSelect;
type Payment = typeof payments.$inferSelect;
type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
type TenantProfile = typeof tenantProfiles.$inferSelect;
type TenantDocument = typeof tenantDocuments.$inferSelect;
type EmploymentInfo = typeof employmentInfo.$inferSelect;
type EmergencyContact = typeof emergencyContacts.$inferSelect;
type OffboardingNotice = typeof tenantOffboardingNotices.$inferSelect;

interface LeaseWithDetails {
  lease: Lease;
  unit: Unit;
  property: Property;
}

interface DashboardClientProps {
  user: User;
  lease: LeaseWithDetails;
  payments: Payment[];
  maintenanceRequests: MaintenanceRequest[];
  profile: TenantProfile | null;
  employment: EmploymentInfo | null;
  emergencyContacts: EmergencyContact[];
  tenantDocuments: TenantDocument[];
  offboardingNotice: OffboardingNotice | null;
  isDelinquent: boolean;
}

export function DashboardClient({
  user,
  lease,
  payments,
  maintenanceRequests,
  profile,
  employment,
  emergencyContacts,
  tenantDocuments,
  offboardingNotice,
  isDelinquent,
}: DashboardClientProps) {
  const router = useRouter();

  const handleOffboardingChange = () => {
    router.refresh();
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold tracking-tight">
            Welcome back, {user.first_name}
          </h1>
          <p className="text-muted-foreground">
            Unit {lease.unit.unitNumber} at {lease.property.name}
          </p>
        </div>

        {/* Delinquency Banner */}
        {isDelinquent && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/50">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-300">
                Dashboard Access Restricted
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                You have one or more overdue rent payments. Your dashboard has
                been restricted to payments only. Please complete your
                outstanding payments to restore full access.
              </p>
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <Tabs defaultValue={isDelinquent ? "payments" : "overview"} className="w-full">
          <TabsList className="mb-8 grid w-full grid-cols-5">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2"
              disabled={isDelinquent}
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="maintenance"
              className="flex items-center gap-2"
              disabled={isDelinquent}
            >
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Maintenance</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="flex items-center gap-2"
              disabled={isDelinquent}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="flex items-center gap-2"
              disabled={isDelinquent}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              lease={lease}
              payments={payments}
              maintenanceRequests={maintenanceRequests}
              offboardingNotice={offboardingNotice}
              onOffboardingChange={handleOffboardingChange}
            />
          </TabsContent>
          <TabsContent value="maintenance">
            <MaintenanceTab
              requests={maintenanceRequests}
              unitId={lease.unit.id}
            />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab payments={payments} lease={lease} />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsTab
              lease={lease}
              tenantDocuments={tenantDocuments}
              profileId={profile?.id ?? null}
            />
          </TabsContent>
          <TabsContent value="profile">
            <ProfileTab
              user={user}
              profile={profile}
              employment={employment}
              emergencyContacts={emergencyContacts}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
