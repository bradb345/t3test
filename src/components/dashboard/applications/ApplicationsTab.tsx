"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { FileText } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import type {
  tenancyApplications,
  units,
  properties,
} from "~/server/db/schema";

type Application = typeof tenancyApplications.$inferSelect;
type Unit = typeof units.$inferSelect;
type Property = typeof properties.$inferSelect;

export interface ApplicationWithDetails {
  application: Application;
  unit: Unit;
  property: Property;
}

interface ApplicationsTabProps {
  applications: ApplicationWithDetails[];
}

const applicationStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  withdrawn: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  under_review: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export function ApplicationsTab({ applications }: ApplicationsTabProps) {
  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-semibold">No applications yet</h3>
          <p className="text-center text-sm text-muted-foreground">
            When you apply to rent a unit, it will appear here.
          </p>
          <Link
            href="/search"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Browse available units
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {applications.map(({ application, unit, property }) => (
              <div
                key={application.id}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold">
                      Unit {unit.unitNumber} at {property.name}
                    </h4>
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
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                      applicationStatusColors[application.status] ?? applicationStatusColors.pending
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
        </CardContent>
      </Card>
    </div>
  );
}
