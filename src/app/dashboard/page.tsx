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
  employmentInfo,
  emergencyContacts,
  tenantOffboardingNotices,
} from "~/server/db/schema";
import { eq, and, asc, desc, or, inArray } from "drizzle-orm";
import { hasRole } from "~/lib/roles";
import { DashboardClient } from "~/components/dashboard/DashboardClient";

export default async function TenantDashboard() {
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

  // Verify user has tenant role
  if (!hasRole(dbUser.roles, "tenant")) {
    redirect("/");
  }

  // Get active or notice_given lease with unit and property info
  const leaseResult = await db
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
        or(eq(leases.status, "active"), eq(leases.status, "notice_given"))
      )
    )
    .orderBy(asc(leases.status), desc(leases.createdAt))
    .limit(1);

  const activeLease = leaseResult[0];

  // Redirect if no active or notice_given lease
  if (!activeLease) {
    redirect("/");
  }

  // Fetch active offboarding notice if lease is in notice_given status
  let activeOffboardingNotice: typeof tenantOffboardingNotices.$inferSelect | null = null;
  if (activeLease.lease.status === "notice_given") {
    const [notice] = await db
      .select()
      .from(tenantOffboardingNotices)
      .where(
        and(
          eq(tenantOffboardingNotices.leaseId, activeLease.lease.id),
          inArray(tenantOffboardingNotices.status, ["active", "inspection_scheduled"])
        )
      )
      .limit(1);
    activeOffboardingNotice = notice ?? null;
  }

  // Fetch remaining data in parallel
  const [recentPayments, maintenanceReqs, profile] = await Promise.all([
    // Get payments for this tenant
    db
      .select()
      .from(payments)
      .where(eq(payments.tenantId, dbUser.id))
      .orderBy(desc(payments.dueDate))
      .limit(50),

    // Get maintenance requests for this tenant
    db
      .select()
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.requestedBy, dbUser.id))
      .orderBy(desc(maintenanceRequests.createdAt))
      .limit(50),

    // Get tenant profile
    db
      .select()
      .from(tenantProfiles)
      .where(eq(tenantProfiles.userId, dbUser.id))
      .limit(1),
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

  return (
    <DashboardClient
      user={dbUser}
      lease={activeLease}
      payments={recentPayments}
      maintenanceRequests={maintenanceReqs}
      profile={profile[0] ?? null}
      employment={employment}
      emergencyContacts={emergencyContactsList}
      tenantDocuments={documents}
      offboardingNotice={activeOffboardingNotice}
    />
  );
}
