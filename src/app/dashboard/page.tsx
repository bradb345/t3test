import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import {
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
  tenancyApplications,
} from "~/server/db/schema";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { DashboardClient } from "~/components/dashboard/DashboardClient";

export default async function TenantDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; leaseId?: string }>;
}) {
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

  const { tab, leaseId } = await searchParams;

  // Fetch all actionable leases and applications/viewings in parallel
  const [allLeasesResult, applicationResults, tenantViewingRequests] = await Promise.all([
    db
      .select({
        lease: leases,
        unit: units,
        property: properties,
      })
      .from(leases)
      .innerJoin(units, eq(units.id, leases.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(
        and(
          eq(leases.tenantId, dbUser.id),
          inArray(leases.status, ["active", "notice_given", "pending_signature"])
        )
      )
      .orderBy(asc(leases.status), desc(leases.createdAt)),
    db
      .select({
        application: tenancyApplications,
        unit: units,
        property: properties,
      })
      .from(tenancyApplications)
      .innerJoin(units, eq(units.id, tenancyApplications.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(eq(tenancyApplications.applicantUserId, dbUser.id))
      .orderBy(desc(tenancyApplications.createdAt)),
    db
      .select({
        viewingRequest: viewingRequests,
        unit: units,
        property: properties,
      })
      .from(viewingRequests)
      .innerJoin(units, eq(units.id, viewingRequests.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(eq(viewingRequests.requesterUserId, dbUser.id))
      .orderBy(desc(viewingRequests.createdAt)),
  ]);

  // If no leases, no applications, and no viewing requests, redirect
  if (allLeasesResult.length === 0 && applicationResults.length === 0 && tenantViewingRequests.length === 0) {
    redirect("/");
  }

  // Determine selected lease (from query param or default to first)
  let selectedLease = allLeasesResult[0] ?? null;
  if (leaseId) {
    const parsedId = parseInt(leaseId);
    const found = allLeasesResult.find((l) => l.lease.id === parsedId);
    if (found) {
      selectedLease = found;
    }
  }

  // If no lease selected, render dashboard with only applications/viewings
  if (!selectedLease) {
    return (
      <DashboardClient
        user={dbUser}
        lease={null}
        allLeases={[]}
        payments={[]}
        maintenanceRequests={[]}
        profile={null}
        employment={null}
        emergencyContacts={[]}
        tenantDocuments={[]}
        unitDocuments={[]}
        offboardingNotice={null}
        pendingRenewalLease={null}
        isDelinquent={false}
        refunds={[]}
        viewingRequests={tenantViewingRequests}
        applications={applicationResults}
        initialTab={tab}
      />
    );
  }

  // Fetch lease-specific data
  const isActiveOrNotice = selectedLease.lease.status === "active" || selectedLease.lease.status === "notice_given";

  // Fetch active offboarding notice if lease is in notice_given status
  let activeOffboardingNotice: typeof tenantOffboardingNotices.$inferSelect | null = null;
  if (selectedLease.lease.status === "notice_given") {
    const [notice] = await db
      .select()
      .from(tenantOffboardingNotices)
      .where(
        and(
          eq(tenantOffboardingNotices.leaseId, selectedLease.lease.id),
          inArray(tenantOffboardingNotices.status, ["active", "inspection_scheduled"])
        )
      )
      .limit(1);
    activeOffboardingNotice = notice ?? null;
  }

  // Fetch pending renewal lease (if any)
  let pendingRenewalLease: typeof leases.$inferSelect | null = null;
  if (isActiveOrNotice) {
    const [renewalResult] = await db
      .select()
      .from(leases)
      .where(
        and(
          eq(leases.tenantId, dbUser.id),
          eq(leases.status, "pending_renewal"),
          eq(leases.previousLeaseId, selectedLease.lease.id)
        )
      )
      .limit(1);
    pendingRenewalLease = renewalResult ?? null;
  }

  // Fetch remaining data in parallel
  const [recentPayments, maintenanceReqs, profile, tenantRefunds] = await Promise.all([
    // Get payments for selected lease
    db
      .select()
      .from(payments)
      .where(eq(payments.leaseId, selectedLease.lease.id))
      .orderBy(desc(payments.dueDate))
      .limit(50),

    // Get maintenance requests for selected unit
    isActiveOrNotice
      ? db
          .select()
          .from(maintenanceRequests)
          .where(
            and(
              eq(maintenanceRequests.requestedBy, dbUser.id),
              eq(maintenanceRequests.unitId, selectedLease.unit.id)
            )
          )
          .orderBy(desc(maintenanceRequests.createdAt))
          .limit(50)
      : Promise.resolve([]),

    // Get tenant profile
    db
      .select()
      .from(tenantProfiles)
      .where(eq(tenantProfiles.userId, dbUser.id))
      .limit(1),

    // Get refunds for selected lease
    db
      .select()
      .from(refunds)
      .where(
        and(
          eq(refunds.tenantId, dbUser.id),
          eq(refunds.leaseId, selectedLease.lease.id)
        )
      )
      .orderBy(desc(refunds.createdAt)),
  ]);

  // Get profile-related data if profile exists
  let employment = null;
  let emergencyContactsList: typeof emergencyContacts.$inferSelect[] = [];
  let documents: typeof tenantDocuments.$inferSelect[] = [];

  if (profile[0]) {
    const [employmentResult, contactsResult, docsResult] = await Promise.all([
      db
        .select()
        .from(employmentInfo)
        .where(eq(employmentInfo.tenantProfileId, profile[0].id))
        .limit(1),
      db
        .select()
        .from(emergencyContacts)
        .where(eq(emergencyContacts.tenantProfileId, profile[0].id)),
      db
        .select()
        .from(tenantDocuments)
        .where(eq(tenantDocuments.tenantProfileId, profile[0].id)),
    ]);

    employment = employmentResult[0] ?? null;
    emergencyContactsList = contactsResult;
    documents = docsResult;
  }

  // Fetch unit documents for the selected unit
  const unitDocsData = await db
    .select({
      document: unitDocuments,
      uploader: user,
    })
    .from(unitDocuments)
    .innerJoin(user, eq(user.id, unitDocuments.uploadedBy))
    .where(eq(unitDocuments.unitId, selectedLease.unit.id))
    .orderBy(desc(unitDocuments.uploadedAt));

  const unitDocsWithUploader = unitDocsData.map((d) => ({
    ...d.document,
    uploader: d.uploader,
  }));

  return (
    <DashboardClient
      user={dbUser}
      lease={selectedLease}
      allLeases={allLeasesResult}
      payments={recentPayments}
      maintenanceRequests={maintenanceReqs}
      profile={profile[0] ?? null}
      employment={employment}
      emergencyContacts={emergencyContactsList}
      tenantDocuments={documents}
      unitDocuments={unitDocsWithUploader}
      offboardingNotice={activeOffboardingNotice}
      pendingRenewalLease={pendingRenewalLease}
      isDelinquent={selectedLease.lease.delinquent}
      refunds={tenantRefunds}
      viewingRequests={tenantViewingRequests}
      applications={applicationResults}
      initialTab={tab}
    />
  );
}
