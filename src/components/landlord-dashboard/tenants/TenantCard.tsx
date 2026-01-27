"use client";

import Image from "next/image";
import { User, Phone, Mail, Calendar, Building2 } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { TenantWithLease } from "~/types/landlord";

interface TenantCardProps {
  tenant: TenantWithLease;
  onViewDetails: (tenant: TenantWithLease) => void;
}

export function TenantCard({ tenant, onViewDetails }: TenantCardProps) {
  const leaseEnd = new Date(tenant.lease.leaseEnd);
  const now = new Date();
  const daysUntilExpiration = Math.ceil((leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const getStatusBadge = () => {
    if (tenant.lease.status !== "active") {
      return <Badge variant="secondary">{tenant.lease.status}</Badge>;
    }
    if (daysUntilExpiration <= 30) {
      return <Badge className="bg-red-100 text-red-800">Expiring Soon</Badge>;
    }
    if (daysUntilExpiration <= 90) {
      return <Badge className="bg-yellow-100 text-yellow-800">Renewal Due</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
            {tenant.user.image_url ? (
              <Image
                src={tenant.user.image_url}
                alt={`${tenant.user.first_name} ${tenant.user.last_name}`}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">
                  {tenant.user.first_name} {tenant.user.last_name}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {tenant.property.name} - Unit {tenant.unit.unitNumber}
                </p>
              </div>
              {getStatusBadge()}
            </div>

            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                <span className="truncate">{tenant.user.email}</span>
              </p>
              {tenant.user.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  {tenant.user.phone}
                </p>
              )}
              <p className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Lease: {formatDate(tenant.lease.leaseStart)} - {formatDate(tenant.lease.leaseEnd)}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => onViewDetails(tenant)}
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
