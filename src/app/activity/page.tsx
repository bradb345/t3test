import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import {
  tenancyApplications,
  viewingRequests,
  units,
  properties,
  user,
} from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { ActivityClient } from "~/components/activity/ActivityClient";

export default async function ActivityPage() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    redirect("/");
  }

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!dbUser) {
    redirect("/");
  }

  const [applicationResults, viewingRequestResults] = await Promise.all([
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

  if (applicationResults.length === 0 && viewingRequestResults.length === 0) {
    redirect("/");
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <ActivityClient
        applications={applicationResults}
        viewingRequests={viewingRequestResults}
      />
    </div>
  );
}
