"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { RefreshCw, Plus, XCircle } from "lucide-react";
import { formatCurrency } from "~/lib/currency/formatter";
import { formatDate } from "~/lib/date";
import { IssueRefundModal } from "./IssueRefundModal";
import { AlertModal } from "~/components/AlertModal";
import type { RefundWithDetails, TenantWithLease } from "~/types/landlord";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending_tenant_action: { label: "Awaiting Tenant", variant: "secondary" },
  processing: { label: "Processing", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

interface RefundsSectionProps {
  refunds: RefundWithDetails[];
  tenants: TenantWithLease[];
}

export function RefundsSection({
  refunds,
  tenants,
}: RefundsSectionProps) {
  const router = useRouter();
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [alertModal, setAlertModal] = useState({
    open: false,
    title: "",
    description: "",
    variant: "info" as "success" | "error" | "warning" | "info",
    onAction: undefined as (() => void) | undefined,
    actionLabel: undefined as string | undefined,
    cancelLabel: undefined as string | undefined,
  });

  const handleCancelRefund = async (refundId: number) => {
    setCancellingId(refundId);
    try {
      const response = await fetch(`/api/landlord/refunds/${refundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to cancel refund");
      }

      setAlertModal({
        open: true,
        title: "Refund Cancelled",
        description: "The refund has been cancelled and the tenant has been notified.",
        variant: "success",
        onAction: undefined,
        actionLabel: undefined,
        cancelLabel: undefined,
      });
      router.refresh();
    } catch (error) {
      setAlertModal({
        open: true,
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "error",
        onAction: undefined,
        actionLabel: undefined,
        cancelLabel: undefined,
      });
    } finally {
      setCancellingId(null);
    }
  };

  const confirmCancel = (refundId: number) => {
    setAlertModal({
      open: true,
      title: "Cancel Refund",
      description: "Are you sure you want to cancel this refund? The tenant will be notified.",
      variant: "warning",
      actionLabel: "Cancel Refund",
      onAction: () => void handleCancelRefund(refundId),
      cancelLabel: "Keep",
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Refunds & Deposit Returns
              </CardTitle>
              <CardDescription>
                Manage refunds and security deposit returns
              </CardDescription>
            </div>
            <Button onClick={() => setShowIssueModal(true)} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Issue Refund
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {refunds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <RefreshCw className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">No refunds yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Refunds and deposit returns will appear here
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left text-sm font-medium">
                      Tenant
                    </th>
                    <th className="p-3 text-left text-sm font-medium">Type</th>
                    <th className="p-3 text-left text-sm font-medium">
                      Amount
                    </th>
                    <th className="p-3 text-left text-sm font-medium">
                      Status
                    </th>
                    <th className="p-3 text-left text-sm font-medium">Date</th>
                    <th className="p-3 text-left text-sm font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((refund) => {
                    const status =
                      statusConfig[refund.status] ??
                      statusConfig.pending_tenant_action!;
                    return (
                      <tr key={refund.id} className="border-b last:border-0">
                        <td className="p-3 text-sm">
                          {refund.tenant.first_name} {refund.tenant.last_name}
                          <span className="block text-xs text-muted-foreground">
                            Unit {refund.unit.unitNumber}
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          {refund.type === "deposit_return"
                            ? "Deposit Return"
                            : "Refund"}
                        </td>
                        <td className="p-3 text-sm font-medium">
                          {formatCurrency(refund.amount, refund.currency)}
                        </td>
                        <td className="p-3">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatDate(refund.createdAt)}
                        </td>
                        <td className="p-3">
                          {refund.status === "pending_tenant_action" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmCancel(refund.id)}
                              disabled={cancellingId === refund.id}
                              className="text-destructive hover:text-destructive"
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <IssueRefundModal
        open={showIssueModal}
        onOpenChange={setShowIssueModal}
        tenants={tenants}
      />

      <AlertModal
        open={alertModal.open}
        onOpenChange={(isOpen) =>
          setAlertModal((prev) => ({ ...prev, open: isOpen }))
        }
        title={alertModal.title}
        description={alertModal.description}
        variant={alertModal.variant}
        actionLabel={alertModal.actionLabel}
        onAction={alertModal.onAction}
        cancelLabel={alertModal.cancelLabel}
      />
    </>
  );
}
