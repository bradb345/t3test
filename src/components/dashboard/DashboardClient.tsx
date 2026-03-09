"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Home, Wrench, CreditCard, FileText, User, AlertTriangle, Eye, ClipboardList } from "lucide-react";
import { OverviewTab } from "./overview/OverviewTab";
import { MaintenanceTab } from "./maintenance/MaintenanceTab";
import { PaymentsTab } from "./payments/PaymentsTab";
import { DocumentsTab } from "./documents/DocumentsTab";
import { ProfileTab } from "./profile/ProfileTab";
import { ViewingRequestsTab } from "./viewing-requests/ViewingRequestsTab";
import { ApplicationsTab } from "./applications/ApplicationsTab";
import type { ApplicationWithDetails } from "./applications/ApplicationsTab";
import type {
  user,
  leases,
  units,
  properties,
  payments,
  maintenanceRequests,
  tenantProfiles,
  tenantDocuments,
  unitDocuments,
  employmentInfo,
  emergencyContacts,
  tenantOffboardingNotices,
  refunds,
  viewingRequests,
} from "~/server/db/schema";

type UserType = typeof user.$inferSelect;
type Lease = typeof leases.$inferSelect;
type Unit = typeof units.$inferSelect;
type Property = typeof properties.$inferSelect;
type Payment = typeof payments.$inferSelect;
type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
type TenantProfile = typeof tenantProfiles.$inferSelect;
type TenantDocument = typeof tenantDocuments.$inferSelect;
type EmploymentInfo = typeof employmentInfo.$inferSelect;
type EmergencyContact = typeof emergencyContacts.$inferSelect;
type UnitDocument = typeof unitDocuments.$inferSelect;
type Refund = typeof refunds.$inferSelect;
type OffboardingNotice = typeof tenantOffboardingNotices.$inferSelect;
type ViewingRequest = typeof viewingRequests.$inferSelect;

interface LeaseWithDetails {
  lease: Lease;
  unit: Unit;
  property: Property;
}

interface ViewingRequestWithDetails {
  viewingRequest: ViewingRequest;
  unit: Unit;
  property: Property;
}

export interface UnitDocumentWithUploader extends UnitDocument {
  uploader: UserType;
}

const leaseStatusLabels: Record<string, string> = {
  active: "Active",
  notice_given: "Notice Given",
  pending_signature: "Pending Signature",
};

interface DashboardClientProps {
  user: UserType;
  lease: LeaseWithDetails | null;
  allLeases: LeaseWithDetails[];
  payments: Payment[];
  maintenanceRequests: MaintenanceRequest[];
  profile: TenantProfile | null;
  employment: EmploymentInfo | null;
  emergencyContacts: EmergencyContact[];
  tenantDocuments: TenantDocument[];
  unitDocuments: UnitDocumentWithUploader[];
  offboardingNotice: OffboardingNotice | null;
  pendingRenewalLease: Lease | null;
  isDelinquent: boolean;
  refunds: Refund[];
  viewingRequests: ViewingRequestWithDetails[];
  applications: ApplicationWithDetails[];
  initialTab?: string;
}

type DashboardTab = "overview" | "maintenance" | "payments" | "documents" | "applications" | "viewings" | "profile";

const LEASE_TABS: DashboardTab[] = ["overview", "maintenance", "payments", "documents", "applications", "viewings", "profile"];
const NO_LEASE_TABS: DashboardTab[] = ["applications", "viewings"];
const ALL_TABS: DashboardTab[] = LEASE_TABS;

export function DashboardClient({
  user,
  lease,
  allLeases,
  payments,
  maintenanceRequests,
  profile,
  employment,
  emergencyContacts,
  tenantDocuments,
  unitDocuments,
  offboardingNotice,
  pendingRenewalLease,
  isDelinquent,
  refunds,
  viewingRequests,
  applications,
  initialTab,
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasLease = lease !== null;
  const availableTabs = hasLease ? LEASE_TABS : NO_LEASE_TABS;

  const getDefaultTab = (): DashboardTab => {
    if (!hasLease) {
      return applications.length > 0 ? "applications" : "viewings";
    }
    if (isDelinquent) return "payments";
    return "overview";
  };

  // Start with default to avoid hydration mismatch, then sync with URL
  const [activeTab, setActiveTab] = useState<DashboardTab>(getDefaultTab);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const tabParam = searchParams.get("tab") ?? initialTab;
    if (tabParam && ALL_TABS.includes(tabParam as DashboardTab) && availableTabs.includes(tabParam as DashboardTab)) {
      setActiveTab(tabParam as DashboardTab);
    }
  }, [searchParams, initialTab, availableTabs]);

  const handleTabChange = (tab: string) => {
    const newTab = tab as DashboardTab;
    setActiveTab(newTab);

    if (isHydrated) {
      const url = new URL(window.location.href);
      if (newTab === getDefaultTab()) {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", newTab);
      }
      router.replace(url.pathname + url.search, { scroll: false });
    }
  };

  const handleLeaseSwitch = (leaseIdStr: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("leaseId", leaseIdStr);
    url.searchParams.delete("tab");
    router.push(url.pathname + url.search);
  };

  const handleOffboardingChange = () => {
    router.refresh();
  };

  const isTabDisabled = (tab: DashboardTab) => {
    if (!hasLease) return false;
    if (tab === "applications" || tab === "viewings" || tab === "payments") return false;
    return isDelinquent;
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold tracking-tight">
            Welcome back, {user.first_name}
          </h1>
          {hasLease ? (
            <p className="text-muted-foreground">
              Unit {lease.unit.unitNumber} at {lease.property.name}
            </p>
          ) : (
            <p className="text-muted-foreground">
              Your applications and viewing requests
            </p>
          )}
        </div>

        {/* Lease Switcher */}
        {allLeases.length > 1 && (
          <div className="mb-6">
            <Select
              value={String(lease?.lease.id ?? "")}
              onValueChange={handleLeaseSwitch}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a unit" />
              </SelectTrigger>
              <SelectContent>
                {allLeases.map((l) => (
                  <SelectItem key={l.lease.id} value={String(l.lease.id)}>
                    <div className="flex items-center gap-2">
                      <span>Unit {l.unit.unitNumber} at {l.property.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {leaseStatusLabels[l.lease.status] ?? l.lease.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-8 flex w-full flex-wrap h-auto gap-1">
            {hasLease && (
              <>
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2"
                  disabled={isTabDisabled("overview")}
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger
                  value="maintenance"
                  className="flex items-center gap-2"
                  disabled={isTabDisabled("maintenance")}
                >
                  <Wrench className="h-4 w-4" />
                  <span className="hidden sm:inline">Maintenance</span>
                </TabsTrigger>
                <TabsTrigger
                  value="payments"
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Payments</span>
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="flex items-center gap-2"
                  disabled={isTabDisabled("documents")}
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Documents</span>
                </TabsTrigger>
              </>
            )}
            <TabsTrigger
              value="applications"
              className="flex items-center gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Applications</span>
            </TabsTrigger>
            <TabsTrigger
              value="viewings"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Viewings</span>
            </TabsTrigger>
            {hasLease && (
              <TabsTrigger
                value="profile"
                className="flex items-center gap-2"
                disabled={isTabDisabled("profile")}
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
            )}
          </TabsList>

          {hasLease && !isTabDisabled("overview") && (
            <TabsContent value="overview">
              <OverviewTab
                lease={lease}
                payments={payments}
                maintenanceRequests={maintenanceRequests}
                offboardingNotice={offboardingNotice}
                pendingRenewalLease={pendingRenewalLease}
                onOffboardingChange={handleOffboardingChange}
              />
            </TabsContent>
          )}
          {hasLease && !isTabDisabled("maintenance") && (
            <TabsContent value="maintenance">
              <MaintenanceTab
                requests={maintenanceRequests}
                unitId={lease.unit.id}
              />
            </TabsContent>
          )}
          {hasLease && (
            <TabsContent value="payments">
              <PaymentsTab payments={payments} lease={lease} refunds={refunds} />
            </TabsContent>
          )}
          {hasLease && !isTabDisabled("documents") && (
            <TabsContent value="documents">
              <DocumentsTab
                lease={lease}
                tenantDocuments={tenantDocuments}
                unitDocuments={unitDocuments}
                profileId={profile?.id ?? null}
                currentUserAuthId={user.auth_id}
              />
            </TabsContent>
          )}
          <TabsContent value="applications">
            <ApplicationsTab applications={applications} />
          </TabsContent>
          <TabsContent value="viewings">
            <ViewingRequestsTab viewingRequests={viewingRequests} />
          </TabsContent>
          {hasLease && !isTabDisabled("profile") && (
            <TabsContent value="profile">
              <ProfileTab
                user={user}
                profile={profile}
                employment={employment}
                emergencyContacts={emergencyContacts}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </main>
  );
}
