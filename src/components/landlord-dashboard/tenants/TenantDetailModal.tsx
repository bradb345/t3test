"use client";

import Image from "next/image";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Building2,
  DollarSign,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import Link from "next/link";
import type { TenantWithLease } from "~/types/landlord";

interface TenantDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantWithLease | null;
}

export function TenantDetailModal({
  open,
  onOpenChange,
  tenant,
}: TenantDetailModalProps) {
  if (!tenant) return null;

  const leaseEnd = new Date(tenant.lease.leaseEnd);
  const now = new Date();
  const daysUntilExpiration = Math.ceil(
    (leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

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
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: tenant.lease.currency,
    }).format(num);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
              {tenant.user.image_url ? (
                <Image
                  src={tenant.user.image_url}
                  alt={`${tenant.user.first_name} ${tenant.user.last_name}`}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <span>
                {tenant.user.first_name} {tenant.user.last_name}
              </span>
              <p className="text-sm font-normal text-muted-foreground">
                Tenant
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Contact Information</h4>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a
                  href={`mailto:${tenant.user.email}`}
                  className="text-primary hover:underline"
                >
                  {tenant.user.email}
                </a>
              </p>
              {tenant.user.phone && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a
                    href={`tel:${tenant.user.phone}`}
                    className="text-primary hover:underline"
                  >
                    {tenant.user.phone}
                  </a>
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Property Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Property Details</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {tenant.property.name}
              </p>
              <p className="ml-6">Unit {tenant.unit.unitNumber}</p>
              <p className="ml-6 text-xs">{tenant.property.address}</p>
            </div>
          </div>

          <Separator />

          {/* Lease Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Lease Information</h4>
              {getStatusBadge()}
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(tenant.lease.leaseStart)} - {formatDate(tenant.lease.leaseEnd)}
              </p>
              <p className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(tenant.lease.monthlyRent)} / month
              </p>
              <p className="ml-6 text-xs">
                Rent due on day {tenant.lease.rentDueDay} of each month
              </p>
              {tenant.lease.securityDeposit && (
                <p className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Security deposit: {formatCurrency(tenant.lease.securityDeposit)}
                </p>
              )}
            </div>
          </div>

          {daysUntilExpiration <= 90 && tenant.lease.status === "active" && (
            <>
              <Separator />
              <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                <p className="font-medium">Lease expiring in {daysUntilExpiration} days</p>
                <p className="mt-1 text-xs">
                  Consider reaching out to discuss renewal options.
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" asChild>
              <Link href={`/my-properties/${tenant.property.id}`}>
                View Property
              </Link>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <a href={`mailto:${tenant.user.email}`}>Send Email</a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
