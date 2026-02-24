"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Calendar, Home, DollarSign, Info, FileText } from "lucide-react";
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
}

export function LeaseInfoCard({ lease }: LeaseInfoCardProps) {
  const posthog = usePostHog();

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
            if (docs.length > 0) {
              return (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={docs[0]}
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
      </CardContent>
    </Card>
  );
}
