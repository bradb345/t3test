"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
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
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface EditLeaseTermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaseId: number;
  unitNumber: string;
  propertyName: string;
  tenantName: string;
  currentLeaseStart: Date;
  currentLeaseEnd: Date;
  currentRent: string;
  currentSecurityDeposit: string | null;
  currentRentDueDay: number;
  currency: string;
  onSuccess: () => void;
}

export function EditLeaseTermsModal({
  open,
  onOpenChange,
  leaseId,
  unitNumber,
  propertyName,
  tenantName,
  currentLeaseStart,
  currentLeaseEnd,
  currentRent,
  currentSecurityDeposit,
  currentRentDueDay,
  currency,
  onSuccess,
}: EditLeaseTermsModalProps) {
  const toDateString = (d: Date) => {
    const date = new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [leaseStart, setLeaseStart] = useState(toDateString(currentLeaseStart));
  const [leaseEnd, setLeaseEnd] = useState(toDateString(currentLeaseEnd));
  const [monthlyRent, setMonthlyRent] = useState(currentRent);
  const [securityDeposit, setSecurityDeposit] = useState(
    currentSecurityDeposit ?? ""
  );
  const [rentDueDay, setRentDueDay] = useState(String(currentRentDueDay));
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
  const rentDiff =
    !isNaN(rentNum) && !isNaN(currentRentNum) ? rentNum - currentRentNum : 0;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const rent = parseFloat(monthlyRent);
    if (isNaN(rent) || rent <= 0) {
      setError("Monthly rent must be greater than 0");
      setIsSubmitting(false);
      return;
    }

    const deposit = securityDeposit === "" ? null : parseFloat(securityDeposit);
    if (deposit !== null && (isNaN(deposit) || deposit < 0)) {
      setError("Security deposit must be 0 or greater");
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

    const dueDay = parseInt(rentDueDay);
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 28) {
      setError("Rent due day must be between 1 and 28");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/landlord/leases/${leaseId}/edit-terms`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leaseStart,
            leaseEnd,
            monthlyRent: rent,
            securityDeposit: deposit,
            rentDueDay: dueDay,
          }),
        }
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to update lease terms");
      }

      onSuccess();
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setLeaseStart(toDateString(currentLeaseStart));
    setLeaseEnd(toDateString(currentLeaseEnd));
    setMonthlyRent(currentRent);
    setSecurityDeposit(currentSecurityDeposit ?? "");
    setRentDueDay(String(currentRentDueDay));
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
            <Pencil className="h-5 w-5 text-blue-600" />
            Edit Lease Terms
          </DialogTitle>
          <DialogDescription>
            Update terms for {tenantName}&apos;s lease at Unit {unitNumber},{" "}
            {propertyName}. The tenant will be notified of any changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lease Start */}
          <div className="space-y-2">
            <Label htmlFor="edit-start">Lease Start</Label>
            <Input
              id="edit-start"
              type="date"
              value={leaseStart}
              onChange={(e) => setLeaseStart(e.target.value)}
            />
          </div>

          {/* Lease End */}
          <div className="space-y-2">
            <Label htmlFor="edit-end">Lease End</Label>
            <Input
              id="edit-end"
              type="date"
              value={leaseEnd}
              onChange={(e) => setLeaseEnd(e.target.value)}
            />
          </div>

          {/* Monthly Rent */}
          <div className="space-y-2">
            <Label htmlFor="edit-rent">Monthly Rent ({currency})</Label>
            <Input
              id="edit-rent"
              type="number"
              step="0.01"
              min="0.01"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
            />
            {rentDiff !== 0 && (
              <p
                className={`text-xs ${rentDiff > 0 ? "text-orange-600" : "text-green-600"}`}
              >
                {rentDiff > 0 ? "+" : ""}
                {formatCurrency(rentDiff.toFixed(2))} from current (
                {formatCurrency(currentRent)})
              </p>
            )}
          </div>

          {/* Security Deposit */}
          <div className="space-y-2">
            <Label htmlFor="edit-deposit">Security Deposit ({currency})</Label>
            <Input
              id="edit-deposit"
              type="number"
              step="0.01"
              min="0"
              value={securityDeposit}
              onChange={(e) => setSecurityDeposit(e.target.value)}
            />
          </div>

          {/* Rent Due Day */}
          <div className="space-y-2">
            <Label htmlFor="edit-due-day">Rent Due Day</Label>
            <Select value={rentDueDay} onValueChange={setRentDueDay}>
              <SelectTrigger id="edit-due-day">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {day}
                    {getOrdinalSuffix(day)} of each month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0]!;
}
