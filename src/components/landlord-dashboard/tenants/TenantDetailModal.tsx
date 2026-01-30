"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Building2,
  DollarSign,
  FileText,
  LogOut,
  XCircle,
  CheckCircle2,
  Zap,
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
import type { TenantWithLease, User as UserType } from "~/types/landlord";
import type { OffboardingNotice } from "~/types/offboarding";
import { GiveNoticeModal } from "~/components/GiveNoticeModal";
import { CancelNoticeModal } from "./CancelNoticeModal";
import { CompleteOffboardingModal } from "./CompleteOffboardingModal";
import { getDaysUntilMoveOut, formatMoveOutDate } from "~/lib/offboarding";

interface TenantDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantWithLease | null;
  currentUser?: UserType | null;
  onOffboardingChange?: () => void;
}

export function TenantDetailModal({
  open,
  onOpenChange,
  tenant,
  currentUser,
  onOffboardingChange,
}: TenantDetailModalProps) {
  const [showGiveNotice, setShowGiveNotice] = useState(false);
  const [showCancelNotice, setShowCancelNotice] = useState(false);
  const [showCompleteOffboarding, setShowCompleteOffboarding] = useState(false);
  const [activeNotice, setActiveNotice] = useState<OffboardingNotice | null>(null);
  const [isLoadingNotice, setIsLoadingNotice] = useState(false);
  const [isFastTracking, setIsFastTracking] = useState(false);

  const fetchActiveNotice = useCallback(async () => {
    if (!tenant) return;

    setIsLoadingNotice(true);
    try {
      const response = await fetch("/api/offboarding");
      if (response.ok) {
        const data = await response.json() as { notices: OffboardingNotice[] };
        const notice = data.notices.find(
          (n: OffboardingNotice) =>
            n.leaseId === tenant.lease.id &&
            (n.status === "active" || n.status === "inspection_scheduled")
        );
        setActiveNotice(notice ?? null);
      }
    } catch (error) {
      console.error("Error fetching notice:", error);
    } finally {
      setIsLoadingNotice(false);
    }
  }, [tenant]);

  useEffect(() => {
    if (open && tenant) {
      void fetchActiveNotice();
    }
  }, [open, tenant, fetchActiveNotice]);

  if (!tenant) return null;

  const leaseEnd = new Date(tenant.lease.leaseEnd);
  const now = new Date();
  const daysUntilExpiration = Math.ceil(
    (leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const isAdmin = currentUser?.admin === true;
  const canGiveNotice = tenant.lease.status === "active" && !activeNotice;
  const canCancelNotice = activeNotice?.status === "active";
  const canComplete = activeNotice && activeNotice.status !== "completed" && activeNotice.status !== "cancelled";

  const getStatusBadge = () => {
    if (tenant.lease.status === "notice_given" && activeNotice) {
      const daysLeft = getDaysUntilMoveOut(new Date(activeNotice.moveOutDate));
      return (
        <Badge className="bg-orange-100 text-orange-800">
          Notice Given ({daysLeft} days left)
        </Badge>
      );
    }
    if (tenant.lease.status === "terminated") {
      return <Badge variant="secondary">Terminated</Badge>;
    }
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

  const handleNoticeSuccess = () => {
    void fetchActiveNotice();
    onOffboardingChange?.();
  };

  const handleFastTrack = async () => {
    if (!confirm("Are you sure you want to fast-track this offboarding? This will immediately terminate the lease and make the unit available.")) {
      return;
    }

    setIsFastTracking(true);
    try {
      const response = await fetch("/api/admin/fast-track-offboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaseId: tenant.lease.id }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? "Failed to fast-track offboarding");
      }

      void fetchActiveNotice();
      onOffboardingChange?.();
      onOpenChange(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsFastTracking(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

            {/* Active Notice Display */}
            {activeNotice && activeNotice.status !== "cancelled" && activeNotice.status !== "completed" && (
              <>
                <Separator />
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-start gap-3">
                    <LogOut className="h-5 w-5 flex-shrink-0 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-orange-800">Move-Out Notice Active</p>
                      <p className="mt-1 text-sm text-orange-700">
                        Move-out date: {formatMoveOutDate(new Date(activeNotice.moveOutDate))}
                      </p>
                      <p className="text-sm text-orange-700">
                        {getDaysUntilMoveOut(new Date(activeNotice.moveOutDate))} days remaining
                      </p>
                      {activeNotice.reason && (
                        <p className="mt-2 text-sm text-orange-600 italic">
                          Reason: {activeNotice.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {daysUntilExpiration <= 90 && tenant.lease.status === "active" && !activeNotice && (
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

            {/* Standard Actions */}
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

            {/* Offboarding Actions */}
            {tenant.lease.status !== "terminated" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Move-Out Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    {canGiveNotice && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGiveNotice(true)}
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        disabled={isLoadingNotice}
                      >
                        <LogOut className="h-4 w-4 mr-1" />
                        Give 2-Month Notice
                      </Button>
                    )}
                    {canCancelNotice && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCancelNotice(true)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel Notice
                      </Button>
                    )}
                    {canComplete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCompleteOffboarding(true)}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete Move-Out
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Admin Fast-Track Button */}
            {isAdmin && tenant.lease.status !== "terminated" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-purple-700">Admin Actions</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFastTrack}
                    disabled={isFastTracking}
                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    data-testid="admin-fast-track-offboarding"
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    {isFastTracking ? "Processing..." : "Fast-Track Offboarding"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Immediately terminates the lease (for testing)
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-modals */}
      <GiveNoticeModal
        open={showGiveNotice}
        onOpenChange={setShowGiveNotice}
        leaseId={tenant.lease.id}
        unitNumber={tenant.unit.unitNumber}
        propertyName={tenant.property.name}
        tenantName={`${tenant.user.first_name} ${tenant.user.last_name}`}
        onSuccess={handleNoticeSuccess}
      />

      {activeNotice && (
        <>
          <CancelNoticeModal
            open={showCancelNotice}
            onOpenChange={setShowCancelNotice}
            noticeId={activeNotice.id}
            unitNumber={tenant.unit.unitNumber}
            tenantName={`${tenant.user.first_name} ${tenant.user.last_name}`}
            onSuccess={handleNoticeSuccess}
          />

          <CompleteOffboardingModal
            open={showCompleteOffboarding}
            onOpenChange={setShowCompleteOffboarding}
            noticeId={activeNotice.id}
            unitNumber={tenant.unit.unitNumber}
            tenantName={`${tenant.user.first_name} ${tenant.user.last_name}`}
            securityDeposit={tenant.lease.securityDeposit}
            currency={tenant.lease.currency}
            onSuccess={handleNoticeSuccess}
          />
        </>
      )}
    </>
  );
}
