"use client";

import { useState } from "react";
import { Calendar, AlertTriangle } from "lucide-react";
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
import { calculateMoveOutDate, formatMoveOutDate } from "~/lib/offboarding";

interface GiveNoticeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaseId: number;
  unitNumber: string;
  propertyName: string;
  tenantName: string;
  onSuccess: () => void;
}

export function GiveNoticeModal({
  open,
  onOpenChange,
  leaseId,
  unitNumber,
  propertyName,
  tenantName,
  onSuccess,
}: GiveNoticeModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moveOutDate = calculateMoveOutDate(new Date());

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/offboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaseId,
          reason: reason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to give notice");
      }

      onSuccess();
      onOpenChange(false);
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setReason("");
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Give 2-Month Notice
          </DialogTitle>
          <DialogDescription>
            Issue a move-out notice to {tenantName} for Unit {unitNumber} at{" "}
            {propertyName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Box */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-orange-500" />
              <div className="text-sm text-orange-800">
                <p className="font-medium">
                  This action starts a 2-month countdown
                </p>
                <p className="mt-1">
                  The tenant will be notified and will have until the move-out
                  date to vacate. You can cancel this notice before the move-out
                  date if needed.
                </p>
              </div>
            </div>
          </div>

          {/* Move-out Date Display */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Calculated Move-Out Date
              </p>
              <p className="mt-1 text-xl font-semibold text-primary">
                {formatMoveOutDate(moveOutDate)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                (2 months from today)
              </p>
            </div>
          </div>

          {/* Reason Field */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Notice (optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., End of lease term, property renovations, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? "Sending Notice..." : "Give Notice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
