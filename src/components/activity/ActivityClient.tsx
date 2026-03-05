"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { FileText, Eye, Calendar, MapPin } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import type {
  tenancyApplications,
  viewingRequests,
  units,
  properties,
} from "~/server/db/schema";

type Application = typeof tenancyApplications.$inferSelect;
type ViewingRequest = typeof viewingRequests.$inferSelect;
type Unit = typeof units.$inferSelect;
type Property = typeof properties.$inferSelect;

interface ActivityClientProps {
  applications: { application: Application; unit: Unit; property: Property }[];
  viewingRequests: { viewingRequest: ViewingRequest; unit: Unit; property: Property }[];
}

const applicationStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  withdrawn: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  under_review: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const viewingStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  declined: { label: "Declined", variant: "destructive" },
  completed: { label: "Completed", variant: "outline" },
};

export function ActivityClient({ applications, viewingRequests }: ActivityClientProps) {
  const defaultTab = applications.length > 0 ? "applications" : "viewings";

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">My Activity</h1>
      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="applications" className="gap-2">
            <FileText className="h-4 w-4" />
            Applications
            {applications.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                {applications.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="viewings" className="gap-2">
            <Eye className="h-4 w-4" />
            Viewing Requests
            {viewingRequests.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                {viewingRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          {applications.length === 0 ? (
            <div className="rounded-lg border p-8 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
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
          )}
        </TabsContent>

        <TabsContent value="viewings">
          {viewingRequests.length === 0 ? (
            <div className="rounded-lg border p-8 text-center">
              <Eye className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                You haven&apos;t requested any viewings yet.
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
              {viewingRequests.map(({ viewingRequest, unit, property }) => {
                const config = viewingStatusConfig[viewingRequest.status] ?? viewingStatusConfig.pending!;
                return (
                  <Link
                    key={viewingRequest.id}
                    href={`/units/${unit.id}`}
                    className="block rounded-xl border p-6 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            Unit {unit.unitNumber} at {property.name}
                          </h3>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {property.address}
                        </div>
                        {viewingRequest.preferredDate && (
                          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            Preferred: {new Date(viewingRequest.preferredDate).toLocaleDateString()}
                            {viewingRequest.preferredTime ? ` at ${viewingRequest.preferredTime}` : ""}
                          </div>
                        )}
                        {viewingRequest.message && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {viewingRequest.message}
                          </p>
                        )}
                        {viewingRequest.landlordNotes && (
                          <p className="mt-2 text-sm italic text-muted-foreground">
                            Landlord notes: &ldquo;{viewingRequest.landlordNotes}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        {new Date(viewingRequest.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
