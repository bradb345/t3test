"use client";

import { useState } from "react";
import { CheckCircle2, Calendar, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { DepositStatus } from "~/types/offboarding";

interface CompleteOffboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noticeId: number;
  unitNumber: string;
  tenantName: string;
  securityDeposit: string | null;
  currency: string;
  onSuccess: () => void;
}

export function CompleteOffboardingModal({
  open,
  onOpenChange,
  noticeId,
  unitNumber,
  tenantName,
  securityDeposit,
  currency,
  onSuccess,
}: CompleteOffboardingModalProps) {
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [depositStatus, setDepositStatus] = useState<DepositStatus>("returned");
  const [depositNotes, setDepositNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(num);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/offboarding/${noticeId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspectionDate: inspectionDate || undefined,
          inspectionNotes: inspectionNotes.trim() || undefined,
          depositStatus,
          depositNotes: depositNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? "Failed to complete offboarding");
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setInspectionDate("");
    setInspectionNotes("");
    setDepositStatus("returned");
    setDepositNotes("");
    setError(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Complete Move-Out
          </DialogTitle>
          <DialogDescription>
            Finalize the move-out for {tenantName} from Unit {unitNumber}.
            This will mark the lease as terminated and set the unit as available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Inspection Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Move-Out Inspection
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inspection-date">Inspection Date</Label>
                <Input
                  id="inspection-date"
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspection-notes">Inspection Notes</Label>
              <Textarea
                id="inspection-notes"
                placeholder="Document the unit condition, any damages, items left behind, etc."
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Deposit Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4" />
              Security Deposit
              {securityDeposit && (
                <span className="font-normal text-muted-foreground">
                  ({formatCurrency(securityDeposit)})
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit-status">Deposit Status *</Label>
              <Select
                value={depositStatus}
                onValueChange={(value: DepositStatus) => setDepositStatus(value)}
              >
                <SelectTrigger id="deposit-status">
                  <SelectValue placeholder="Select deposit status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="returned">Full Refund</SelectItem>
                  <SelectItem value="partial">Partial Refund</SelectItem>
                  <SelectItem value="withheld">Withheld</SelectItem>
                  <SelectItem value="pending">Pending Decision</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit-notes">Deposit Notes</Label>
              <Textarea
                id="deposit-notes"
                placeholder={
                  depositStatus === "withheld" || depositStatus === "partial"
                    ? "Explain deductions: damages, unpaid rent, cleaning fees, etc."
                    : "Any additional notes about the deposit return..."
                }
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Warning */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm text-amber-800">
              <p className="font-medium">This action is final</p>
              <p className="mt-1">
                Completing the move-out will terminate the lease and make the unit available
                for new tenants. The tenant will lose their tenant role if they have no other
                active leases.
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "Completing..." : "Complete Move-Out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
