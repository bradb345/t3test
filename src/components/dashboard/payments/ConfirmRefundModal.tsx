"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { AlertModal } from "~/components/AlertModal";
import { formatCurrency } from "~/lib/currency/formatter";
import type { Refund } from "~/types/schema";

interface ConfirmRefundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refund: Refund | null;
}

interface DeductionItem {
  description: string;
  amount: number;
}

export function ConfirmRefundModal({
  open,
  onOpenChange,
  refund,
}: ConfirmRefundModalProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [alertModal, setAlertModal] = useState({
    open: false,
    title: "",
    description: "",
    variant: "info" as "success" | "error" | "info",
  });

  if (!refund) return null;

  let deductions: DeductionItem[] = [];
  if (refund.deductions) {
    try {
      deductions = JSON.parse(refund.deductions) as DeductionItem[];
    } catch {
      // ignore
    }
  }

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const isDepositReturn = refund.type === "deposit_return";

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const response = await fetch(`/api/tenant/refunds/${refund.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useCardOnFile: true }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to confirm refund");
      }

      setAlertModal({
        open: true,
        title: "Refund Confirmed",
        description: `Your refund of ${formatCurrency(refund.amount, refund.currency)} has been processed. The funds will be returned to your payment method.`,
        variant: "success",
      });
      router.refresh();
    } catch (error) {
      setAlertModal({
        open: true,
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "error",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleAlertClose = (isOpen: boolean) => {
    if (!isOpen && alertModal.variant === "success") {
      onOpenChange(false);
    }
    setAlertModal((prev) => ({ ...prev, open: isOpen }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isDepositReturn ? "Security Deposit Return" : "Confirm Refund"}
            </DialogTitle>
            <DialogDescription>
              {isDepositReturn
                ? "Your landlord is returning your security deposit."
                : "Your landlord has initiated a refund for you."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Amount Display */}
            <div className="rounded-lg border bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {isDepositReturn ? "Return Amount" : "Refund Amount"}
              </p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(refund.amount, refund.currency)}
              </p>
            </div>

            {/* Reason */}
            {refund.reason && (
              <div className="rounded-md border p-3">
                <p className="text-sm font-medium text-muted-foreground">Reason</p>
                <p className="text-sm mt-1">{refund.reason}</p>
              </div>
            )}

            {/* Deductions (for deposit returns) */}
            {isDepositReturn && deductions.length > 0 && (
              <div className="rounded-md border p-3 space-y-2">
                <p className="text-sm font-medium">Itemized Deductions</p>
                {deductions.map((d, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{d.description}</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(d.amount, refund.currency)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm border-t pt-2 font-medium">
                  <span>Total Deductions</span>
                  <span className="text-red-600">
                    -{formatCurrency(totalDeductions, refund.currency)}
                  </span>
                </div>
              </div>
            )}

            {/* Deadline */}
            {refund.tenantActionDeadline && (
              <p className="text-xs text-muted-foreground text-center">
                Please confirm by{" "}
                {new Date(refund.tenantActionDeadline).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}

            {/* Confirm Button */}
            <Button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirm & Receive Funds
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertModal
        open={alertModal.open}
        onOpenChange={handleAlertClose}
        title={alertModal.title}
        description={alertModal.description}
        variant={alertModal.variant}
      />
    </>
  );
}
