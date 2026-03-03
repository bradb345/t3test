"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";

interface InitiateRenewalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaseId: number;
  unitNumber: string;
  propertyName: string;
  tenantName: string;
  currentLeaseEnd: Date;
  currentRent: string;
  currency: string;
  onSuccess: () => void;
}

export function InitiateRenewalModal({
  open,
  onOpenChange,
  leaseId,
  unitNumber,
  propertyName,
  tenantName,
  currentLeaseEnd,
  currentRent,
  currency,
  onSuccess,
}: InitiateRenewalModalProps) {
  const defaultStart = new Date(new Date(currentLeaseEnd).getTime() + 24 * 60 * 60 * 1000);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);

  const toDateString = (d: Date) => d.toISOString().split("T")[0]!;

  const [leaseStart, setLeaseStart] = useState(toDateString(defaultStart));
  const [leaseEnd, setLeaseEnd] = useState(toDateString(defaultEnd));
  const [monthlyRent, setMonthlyRent] = useState(currentRent);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return "";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(num);
  };

  const rentNum = parseFloat(monthlyRent);
  const currentRentNum = parseFloat(currentRent);
  const rentDiff = !isNaN(rentNum) && !isNaN(currentRentNum) ? rentNum - currentRentNum : 0;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const rent = parseFloat(monthlyRent);
    if (isNaN(rent) || rent <= 0) {
      setError("Monthly rent must be greater than 0");
      setIsSubmitting(false);
      return;
    }

    const start = new Date(leaseStart);
    const end = new Date(leaseEnd);
    if (end <= start) {
      setError("Lease end date must be after start date");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/landlord/leases/${leaseId}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaseStart,
          leaseEnd,
          monthlyRent: rent,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to initiate renewal");
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
    setLeaseStart(toDateString(defaultStart));
    setLeaseEnd(toDateString(defaultEnd));
    setMonthlyRent(currentRent);
    setNotes("");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-teal-600" />
            Initiate Lease Renewal
          </DialogTitle>
          <DialogDescription>
            Offer a renewal to {tenantName} for Unit {unitNumber} at{" "}
            {propertyName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lease Start */}
          <div className="space-y-2">
            <Label htmlFor="renewal-start">New Lease Start</Label>
            <Input
              id="renewal-start"
              type="date"
              value={leaseStart}
              onChange={(e) => setLeaseStart(e.target.value)}
            />
          </div>

          {/* Lease End */}
          <div className="space-y-2">
            <Label htmlFor="renewal-end">New Lease End</Label>
            <Input
              id="renewal-end"
              type="date"
              value={leaseEnd}
              onChange={(e) => setLeaseEnd(e.target.value)}
            />
          </div>

          {/* Monthly Rent */}
          <div className="space-y-2">
            <Label htmlFor="renewal-rent">Monthly Rent ({currency})</Label>
            <Input
              id="renewal-rent"
              type="number"
              step="0.01"
              min="0"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
            />
            {rentDiff !== 0 && (
              <p className={`text-xs ${rentDiff > 0 ? "text-orange-600" : "text-green-600"}`}>
                {rentDiff > 0 ? "+" : ""}{formatCurrency(rentDiff.toFixed(2))} from current rent ({formatCurrency(currentRent)})
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="renewal-notes">Notes (optional)</Label>
            <Textarea
              id="renewal-notes"
              placeholder="Any notes about this renewal offer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
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
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isSubmitting ? "Sending Offer..." : "Send Renewal Offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
