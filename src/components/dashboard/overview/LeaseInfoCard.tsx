"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Calendar, Home, DollarSign, Info, FileText, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import type { leases, units, properties } from "~/server/db/schema";
import { formatDate } from "~/lib/date";
import { formatCurrency } from "~/lib/currency";
import { trackClientEvent } from "~/lib/posthog-events/client";

type Lease = typeof leases.$inferSelect;
type Unit = typeof units.$inferSelect;
type Property = typeof properties.$inferSelect;

interface LeaseWithDetails {
  lease: Lease;
  unit: Unit;
  property: Property;
}

interface LeaseInfoCardProps {
  lease: LeaseWithDetails;
  pendingRenewalLease?: Lease | null;
  onRenewalAction?: () => void;
}

export function LeaseInfoCard({ lease, pendingRenewalLease, onRenewalAction }: LeaseInfoCardProps) {
  const posthog = usePostHog();
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [renewalError, setRenewalError] = useState<string | null>(null);

  const getStatusBadge = () => {
    if (lease.lease.status === "pending_signature") {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending Signature</Badge>;
    }
    if (lease.lease.status === "notice_given") {
      return <Badge className="bg-orange-100 text-orange-800">Notice Given</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Lease Information
          </CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>
          {lease.property.address}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Unit</p>
            <p className="font-medium">{lease.unit.unitNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Bedrooms / Bathrooms</p>
            <p className="font-medium">
              {lease.unit.numBedrooms} bd / {lease.unit.numBathrooms} ba
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            {formatDate(lease.lease.leaseStart)} - {formatDate(lease.lease.leaseEnd)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-semibold">
            {formatCurrency(lease.lease.monthlyRent, lease.lease.currency)}
          </span>
          <span className="text-sm text-muted-foreground">/ month</span>
        </div>

        <div className="text-sm text-muted-foreground">
          Rent due on the {lease.lease.rentDueDay}
          {lease.lease.rentDueDay === 1
            ? "st"
            : lease.lease.rentDueDay === 2
              ? "nd"
              : lease.lease.rentDueDay === 3
                ? "rd"
                : "th"}{" "}
          of each month
        </div>

        {(() => {
          try {
            const docs = lease.lease.documents
              ? (JSON.parse(lease.lease.documents) as string[])
              : [];
            const firstDoc = docs[0];
            if (firstDoc) {
              try {
                const parsedUrl = new URL(firstDoc);
                const hostname = parsedUrl.hostname;
                const isSafe =
                  parsedUrl.protocol === "https:" &&
                  (hostname === "utfs.io" ||
                    hostname === "uploadthing.com" ||
                    hostname.endsWith(".ufs.sh") ||
                    hostname.endsWith(".uploadthing.com"));
                if (!isSafe) return null;
              } catch {
                return null;
              }
              return (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={firstDoc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={() => {
                      trackClientEvent(posthog, "signed_lease_viewed", {
                        lease_id: lease.lease.id,
                        unit_id: lease.unit.id,
                      });
                    }}
                  >
                    View Signed Lease
                  </a>
                </div>
              );
            }
          } catch {
            // Invalid JSON in documents field
          }
          return null;
        })()}

        {lease.lease.status === "pending_signature" && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <Info className="h-4 w-4 flex-shrink-0 text-yellow-600 mt-0.5" />
            <p className="text-sm text-yellow-800">
              Your landlord is handling the lease signing. You&apos;ll be notified once the lease is signed and your move-in payment is ready.
            </p>
          </div>
        )}

        {pendingRenewalLease && (
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <RefreshCw className="h-5 w-5 flex-shrink-0 text-teal-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-teal-800">Lease Renewal Offered</p>
                <p className="mt-1 text-sm text-teal-700">
                  Your landlord has offered to renew your lease with the following terms:
                </p>
                <div className="mt-2 space-y-1 text-sm text-teal-700">
                  <p>
                    <span className="font-medium">New dates:</span>{" "}
                    {formatDate(pendingRenewalLease.leaseStart)} - {formatDate(pendingRenewalLease.leaseEnd)}
                  </p>
                  <p>
                    <span className="font-medium">New rent:</span>{" "}
                    {formatCurrency(pendingRenewalLease.monthlyRent, pendingRenewalLease.currency)}
                    {pendingRenewalLease.monthlyRent !== lease.lease.monthlyRent && (
                      <span className="ml-1 text-xs">
                        (currently {formatCurrency(lease.lease.monthlyRent, lease.lease.currency)})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {renewalError && (
              <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">
                {renewalError}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                onClick={async () => {
                  setIsAccepting(true);
                  setRenewalError(null);
                  try {
                    const response = await fetch(
                      `/api/tenant/leases/${pendingRenewalLease.id}/acknowledge-renewal`,
                      { method: "PATCH" }
                    );
                    if (!response.ok) {
                      const data = (await response.json()) as { error?: string };
                      throw new Error(data.error ?? "Failed to accept renewal");
                    }
                    onRenewalAction?.();
                    router.refresh();
                  } catch (err) {
                    setRenewalError(err instanceof Error ? err.message : "An error occurred");
                  } finally {
                    setIsAccepting(false);
                  }
                }}
                disabled={isAccepting || isDeclining}
              >
                {isAccepting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : null}
                {isAccepting ? "Accepting..." : "Accept Renewal"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={async () => {
                  setIsDeclining(true);
                  setRenewalError(null);
                  try {
                    const response = await fetch(
                      `/api/tenant/leases/${pendingRenewalLease.id}/decline-renewal`,
                      { method: "PATCH" }
                    );
                    if (!response.ok) {
                      const data = (await response.json()) as { error?: string };
                      throw new Error(data.error ?? "Failed to decline renewal");
                    }
                    onRenewalAction?.();
                    router.refresh();
                  } catch (err) {
                    setRenewalError(err instanceof Error ? err.message : "An error occurred");
                  } finally {
                    setIsDeclining(false);
                  }
                }}
                disabled={isAccepting || isDeclining}
              >
                {isDeclining ? "Declining..." : "Decline"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
