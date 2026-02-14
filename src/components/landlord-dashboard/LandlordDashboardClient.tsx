"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Home,
  Building2,
  Users,
  Wrench,
  FileText,
  DollarSign,
  Inbox,
  ClipboardList,
} from "lucide-react";
import { OverviewTab } from "./overview/OverviewTab";
import { PropertiesTab } from "./properties/PropertiesTab";
import { TenantsTab } from "./tenants/TenantsTab";
import { MaintenanceTab } from "./maintenance/MaintenanceTab";
import { DocumentsTab } from "./documents/DocumentsTab";
import { FinancialsTab } from "./financials/FinancialsTab";
import { InquiriesTab } from "./inquiries/InquiriesTab";
import { ApplicationsTab } from "./applications/ApplicationsTab";
import type {
  User,
  PropertyWithUnits,
  LandlordStats,
  LeaseExpiration,
  TenantWithLease,
  MaintenanceRequestWithDetails,
  DocumentWithDetails,
  PaymentWithDetails,
  ViewingRequestWithDetails,
  LandlordDashboardTab,
} from "~/types/landlord";

interface LandlordDashboardClientProps {
  user: User;
  properties: PropertyWithUnits[];
  stats: LandlordStats;
  leaseExpirations: LeaseExpiration[];
  tenants: TenantWithLease[];
  maintenanceRequests: MaintenanceRequestWithDetails[];
  documents: DocumentWithDetails[];
  payments: PaymentWithDetails[];
  viewingRequests: ViewingRequestWithDetails[];
}

const VALID_TABS: LandlordDashboardTab[] = [
  "overview",
  "properties",
  "tenants",
  "maintenance",
  "documents",
  "financials",
  "inquiries",
  "applications",
];

export function LandlordDashboardClient({
  user,
  properties,
  stats,
  leaseExpirations,
  tenants,
  maintenanceRequests,
  documents,
  payments,
  viewingRequests,
}: LandlordDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Start with "overview" on both server and client to avoid hydration mismatch
  // Then sync with URL on client side via useEffect
  const [activeTab, setActiveTab] = useState<LandlordDashboardTab>("overview");
  const [isHydrated, setIsHydrated] = useState(false);

  // Sync with URL on client side after hydration
  useEffect(() => {
    setIsHydrated(true);
    const tabParam = searchParams.get("tab");
    if (tabParam && VALID_TABS.includes(tabParam as LandlordDashboardTab)) {
      setActiveTab(tabParam as LandlordDashboardTab);
    }
  }, [searchParams]);

  // Update URL when tab changes (only after hydration)
  const handleTabChange = (tab: string) => {
    const newTab = tab as LandlordDashboardTab;
    setActiveTab(newTab);

    // Only update URL after hydration to avoid issues
    if (isHydrated) {
      const url = new URL(window.location.href);
      if (newTab === "overview") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", newTab);
      }
      router.replace(url.pathname + url.search, { scroll: false });
    }
  };

  // Placeholder for tenant invitation - this would typically open a modal
  const handleInviteTenant = () => {
    // Navigate to the first property to invite a tenant
    if (properties.length > 0) {
      router.push(`/my-properties/${properties[0]!.id}#invite-tenant`);
    }
  };

  const pendingInquiries = viewingRequests.filter((r) => r.status === "pending").length;
  const pendingMaintenance = maintenanceRequests.filter(
    (r) => r.status === "pending" || r.status === "in_progress"
  ).length;

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold tracking-tight">
            Landlord Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user.first_name}
          </p>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-8 flex w-full flex-wrap h-auto gap-1 sm:grid sm:grid-cols-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Properties</span>
            </TabsTrigger>
            <TabsTrigger value="tenants" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Tenants</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="relative flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Maintenance</span>
              {pendingMaintenance > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-medium text-white sm:relative sm:right-0 sm:top-0 sm:ml-1">
                  {pendingMaintenance > 9 ? "9+" : pendingMaintenance}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="financials" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Financials</span>
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="relative flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              <span className="hidden sm:inline">Inquiries</span>
              {pendingInquiries > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white sm:relative sm:right-0 sm:top-0 sm:ml-1">
                  {pendingInquiries > 9 ? "9+" : pendingInquiries}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Applications</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              stats={stats}
              leaseExpirations={leaseExpirations}
              maintenanceRequests={maintenanceRequests}
              onTabChange={handleTabChange}
              onInviteTenant={handleInviteTenant}
            />
          </TabsContent>

          <TabsContent value="properties">
            <PropertiesTab properties={properties} />
          </TabsContent>

          <TabsContent value="tenants">
            <TenantsTab tenants={tenants} currentUser={user} />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceTab requests={maintenanceRequests} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab documents={documents} properties={properties} />
          </TabsContent>

          <TabsContent value="financials">
            <FinancialsTab
              payments={payments}
              properties={properties}
              currency={stats.currency}
              stripeConnectedAccountStatus={user.stripeConnectedAccountStatus ?? null}
            />
          </TabsContent>

          <TabsContent value="inquiries">
            <InquiriesTab requests={viewingRequests} properties={properties} />
          </TabsContent>

          <TabsContent value="applications">
            <ApplicationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
