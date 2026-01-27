"use client";

import { Calendar, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { LeaseExpiration } from "~/types/landlord";

interface LeaseExpirationsCardProps {
  expirations: LeaseExpiration[];
  onViewTenants: () => void;
}

export function LeaseExpirationsCard({ expirations, onViewTenants }: LeaseExpirationsCardProps) {
  const upcomingExpirations = expirations.slice(0, 3);

  const getUrgencyColor = (days: number) => {
    if (days <= 30) return "bg-red-100 text-red-800";
    if (days <= 60) return "bg-orange-100 text-orange-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Calendar className="h-5 w-5" />
          Upcoming Lease Expirations
        </CardTitle>
        {expirations.length > 0 && (
          <Badge variant="secondary">{expirations.length} expiring</Badge>
        )}
      </CardHeader>
      <CardContent>
        {upcomingExpirations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-green-100 p-3">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <p className="mt-3 text-sm font-medium">No upcoming expirations</p>
            <p className="text-xs text-muted-foreground">All leases are stable for now</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingExpirations.map((expiration) => (
              <div
                key={expiration.leaseId}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <div className="flex-shrink-0">
                  {expiration.daysUntilExpiration <= 30 ? (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  ) : (
                    <Calendar className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{expiration.tenantName}</p>
                  <p className="text-xs text-muted-foreground">
                    {expiration.propertyName} - Unit {expiration.unitNumber}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={getUrgencyColor(expiration.daysUntilExpiration)}>
                      {expiration.daysUntilExpiration} days
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Expires {formatDate(expiration.expirationDate)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={onViewTenants}
            >
              View all tenants
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
