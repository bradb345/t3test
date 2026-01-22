"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Calendar, Home, DollarSign } from "lucide-react";
import type { leases, units, properties } from "~/server/db/schema";

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
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: string | number, currency: string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(num);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Lease Information
          </CardTitle>
          <Badge variant="default">Active</Badge>
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
      </CardContent>
    </Card>
  );
}
