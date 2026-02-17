import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import {
  tenancyApplications,
  units,
  properties,
  user,
} from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { formatCurrency } from "~/lib/currency";

export default async function ApplicationsPage() {
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

  // Fetch all applications for this user
  const applications = await db
    .select({
      application: tenancyApplications,
      unit: units,
      property: properties,
    })
    .from(tenancyApplications)
    .innerJoin(units, eq(units.id, tenancyApplications.unitId))
    .innerJoin(properties, eq(properties.id, units.propertyId))
    .where(eq(tenancyApplications.applicantUserId, dbUser.id))
    .orderBy(desc(tenancyApplications.createdAt));

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    withdrawn: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    under_review: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">My Applications</h1>

      {applications.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            You haven&apos;t submitted any applications yet.
          </p>
          <Link
            href="/search"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Browse available units
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(({ application, unit, property }) => (
            <div
              key={application.id}
              className="rounded-xl border p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold">
                    Unit {unit.unitNumber} at {property.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {property.address}
                  </p>
                  <p className="mt-1 text-sm">
                    {formatCurrency(
                      parseFloat(unit.monthlyRent ?? "0"),
                      unit.currency
                    )}{" "}
                    / month
                  </p>
                  {application.submittedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Submitted{" "}
                      {new Date(application.submittedAt).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    statusColors[application.status] ?? statusColors.pending
                  }`}
                >
                  {application.status.replace("_", " ")}
                </span>
              </div>

              {application.status === "rejected" &&
                application.decisionNotes && (
                  <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    {application.decisionNotes}
                  </div>
                )}

              <div className="mt-4 flex gap-3">
                <Link
                  href={`/units/${unit.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View Unit
                </Link>
                {application.status === "approved" && (
                  <Link
                    href="/dashboard?tab=payments"
                    className="text-sm font-medium text-green-600 hover:underline dark:text-green-400"
                  >
                    Make your move-in payment
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
