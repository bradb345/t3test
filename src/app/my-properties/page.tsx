import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import {
  user,
  properties,
  units,
  leases,
  maintenanceRequests,
  payments,
  tenantDocuments,
  tenantProfiles,
  viewingRequests,
} from "~/server/db/schema";
import { eq, and, desc, inArray, or } from "drizzle-orm";
import { hasRole } from "~/lib/roles";
import { LandlordDashboardClient } from "~/components/landlord-dashboard/LandlordDashboardClient";
import type {
  PropertyWithUnits,
  LandlordStats,
  LeaseExpiration,
  TenantWithLease,
  MaintenanceRequestWithDetails,
  DocumentWithDetails,
  PaymentWithDetails,
  ViewingRequestWithDetails,
} from "~/types/landlord";

export default async function MyPropertiesPage() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    redirect("/");
  }

  // Get user from database
  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!dbUser) {
    redirect("/");
  }

  // Verify user has landlord role
  if (!hasRole(dbUser.roles, "landlord")) {
    redirect("/");
  }

  // Fetch properties with units
  const userProperties = await db.query.properties.findMany({
    where: eq(properties.userId, clerkUserId),
    orderBy: [desc(properties.createdAt)],
  });

  const propertyIds = userProperties.map((p) => p.id);

  // If no properties, return early with empty data
  if (propertyIds.length === 0) {
    const emptyStats: LandlordStats = {
      totalProperties: 0,
      totalUnits: 0,
      occupiedUnits: 0,
      occupancyRate: 0,
      monthlyRevenue: 0,
      pendingMaintenance: 0,
      upcomingExpirations: 0,
      currency: "USD",
    };

    return (
      <LandlordDashboardClient
        user={dbUser}
        properties={[]}
        stats={emptyStats}
        leaseExpirations={[]}
        tenants={[]}
        maintenanceRequests={[]}
        documents={[]}
        payments={[]}
        viewingRequests={[]}
      />
    );
  }

  // Fetch units for all properties
  const allUnits = await db
    .select()
    .from(units)
    .where(inArray(units.propertyId, propertyIds));

  const unitIds = allUnits.map((u) => u.id);

  // Build properties with units
  const propertiesWithUnits: PropertyWithUnits[] = userProperties.map((property) => ({
    ...property,
    units: allUnits.filter((u) => u.propertyId === property.id),
  }));

  // Fetch active, notice_given, and terminated leases for landlord's units
  // notice_given tenants are still occupying units; terminated shown for filtering
  const activeLeases = unitIds.length > 0
    ? await db
        .select({
          lease: leases,
          unit: units,
          property: properties,
          tenant: user,
        })
        .from(leases)
        .innerJoin(units, eq(units.id, leases.unitId))
        .innerJoin(properties, eq(properties.id, units.propertyId))
        .innerJoin(user, eq(user.id, leases.tenantId))
        .where(
          and(
            inArray(leases.unitId, unitIds),
            or(eq(leases.status, "active"), eq(leases.status, "notice_given"), eq(leases.status, "terminated"))
          )
        )
        .orderBy(desc(leases.createdAt))
    : [];

  // Calculate stats (exclude terminated leases from occupancy/revenue)
  const currentLeases = activeLeases.filter((l) => l.lease.status !== "terminated");
  const occupiedUnits = currentLeases.length;
  const totalUnits = allUnits.length;
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
  const monthlyRevenue = currentLeases.reduce(
    (sum, l) => sum + parseFloat(l.lease.monthlyRent),
    0
  );

  // Get lease expirations (next 90 days)
  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const leaseExpirations: LeaseExpiration[] = activeLeases
    .filter((l) => {
      const endDate = new Date(l.lease.leaseEnd);
      return endDate >= now && endDate <= ninetyDaysFromNow;
    })
    .map((l) => ({
      leaseId: l.lease.id,
      tenantName: `${l.tenant.first_name} ${l.tenant.last_name}`,
      unitNumber: l.unit.unitNumber,
      propertyName: l.property.name,
      expirationDate: new Date(l.lease.leaseEnd),
      daysUntilExpiration: Math.ceil(
        (new Date(l.lease.leaseEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))
    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

  // Build tenants with lease info
  const tenants: TenantWithLease[] = activeLeases.map((l) => ({
    user: l.tenant,
    lease: l.lease,
    unit: l.unit,
    property: l.property,
  }));

  // Fetch maintenance requests with details
  const maintenanceReqs = unitIds.length > 0
    ? await db
        .select({
          request: maintenanceRequests,
          unit: units,
          property: properties,
          tenant: user,
        })
        .from(maintenanceRequests)
        .innerJoin(units, eq(units.id, maintenanceRequests.unitId))
        .innerJoin(properties, eq(properties.id, units.propertyId))
        .innerJoin(user, eq(user.id, maintenanceRequests.requestedBy))
        .where(inArray(maintenanceRequests.unitId, unitIds))
        .orderBy(desc(maintenanceRequests.createdAt))
    : [];

  const maintenanceWithDetails: MaintenanceRequestWithDetails[] = maintenanceReqs.map(
    (m) => ({
      ...m.request,
      unit: m.unit,
      property: m.property,
      tenant: m.tenant,
    })
  );

  const pendingMaintenance = maintenanceWithDetails.filter(
    (m) => m.status === "pending" || m.status === "in_progress"
  ).length;

  // Fetch documents from tenants in landlord's properties
  const tenantIds = activeLeases.map((l) => l.tenant.id);
  let documentsWithDetails: DocumentWithDetails[] = [];

  if (tenantIds.length > 0) {
    // Get tenant profiles for the tenants
    const profiles = await db
      .select()
      .from(tenantProfiles)
      .where(inArray(tenantProfiles.userId, tenantIds));

    const profileIds = profiles.map((p) => p.id);

    if (profileIds.length > 0) {
      const docs = await db
        .select()
        .from(tenantDocuments)
        .where(inArray(tenantDocuments.tenantProfileId, profileIds))
        .orderBy(desc(tenantDocuments.uploadedAt));

      // Map documents with tenant/property info
      documentsWithDetails = docs.map((doc) => {
        const profile = profiles.find((p) => p.id === doc.tenantProfileId);
        const tenantLease = activeLeases.find((l) => l.tenant.id === profile?.userId);
        return {
          ...doc,
          tenant: tenantLease?.tenant ?? {
            id: 0,
            auth_id: "",
            email: "",
            first_name: "Unknown",
            last_name: "Tenant",
            image_url: null,
            roles: null,
            phone: null,
            preferredContactMethod: null,
            notifications: null,
            stripeCustomerId: null,
            stripeConnectedAccountId: null,
            stripeConnectedAccountStatus: null,
            createdAt: new Date(),
            updatedAt: null,
            admin: false,
          },
          unit: tenantLease?.unit ?? null,
          property: tenantLease?.property ?? null,
        };
      });
    }
  }

  // Fetch payments with details
  const paymentsData = tenantIds.length > 0
    ? await db
        .select({
          payment: payments,
          tenant: user,
          lease: leases,
          unit: units,
          property: properties,
        })
        .from(payments)
        .innerJoin(leases, eq(leases.id, payments.leaseId))
        .innerJoin(user, eq(user.id, payments.tenantId))
        .innerJoin(units, eq(units.id, leases.unitId))
        .innerJoin(properties, eq(properties.id, units.propertyId))
        .where(inArray(payments.tenantId, tenantIds))
        .orderBy(desc(payments.dueDate))
        .limit(100)
    : [];

  const paymentsWithDetails: PaymentWithDetails[] = paymentsData.map((p) => ({
    ...p.payment,
    tenant: p.tenant,
    lease: p.lease,
    unit: p.unit,
    property: p.property,
  }));

  // Fetch viewing requests for landlord's units
  const viewingReqs = unitIds.length > 0
    ? await db
        .select({
          request: viewingRequests,
          unit: units,
          property: properties,
        })
        .from(viewingRequests)
        .innerJoin(units, eq(units.id, viewingRequests.unitId))
        .innerJoin(properties, eq(properties.id, units.propertyId))
        .where(inArray(viewingRequests.unitId, unitIds))
        .orderBy(desc(viewingRequests.createdAt))
    : [];

  const viewingRequestsWithDetails: ViewingRequestWithDetails[] = viewingReqs.map(
    (v) => ({
      ...v.request,
      status: v.request.status as "pending" | "approved" | "declined" | "completed",
      unit: v.unit,
      property: v.property,
    })
  );

  // Determine currency (use first property's currency or default to USD)
  const currency = userProperties[0]?.currency ?? "USD";

  const stats: LandlordStats = {
    totalProperties: userProperties.length,
    totalUnits,
    occupiedUnits,
    occupancyRate,
    monthlyRevenue,
    pendingMaintenance,
    upcomingExpirations: leaseExpirations.length,
    currency,
  };

  return (
    <LandlordDashboardClient
      user={dbUser}
      properties={propertiesWithUnits}
      stats={stats}
      leaseExpirations={leaseExpirations}
      tenants={tenants}
      maintenanceRequests={maintenanceWithDetails}
      documents={documentsWithDetails}
      payments={paymentsWithDetails}
      viewingRequests={viewingRequestsWithDetails}
    />
  );
}
