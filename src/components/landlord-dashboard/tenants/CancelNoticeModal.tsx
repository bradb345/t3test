"use client";

import { useState } from "react";
import { XCircle } from "lucide-react";
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

interface CancelNoticeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noticeId: number;
  unitNumber: string;
  tenantName: string;
  onSuccess: () => void;
}

export function CancelNoticeModal({
  open,
  onOpenChange,
  noticeId,
  unitNumber,
  tenantName,
  onSuccess,
}: CancelNoticeModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/offboarding/${noticeId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancellationReason: reason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? "Failed to cancel notice");
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
            <XCircle className="h-5 w-5 text-red-500" />
            Cancel Move-Out Notice
          </DialogTitle>
          <DialogDescription>
            Cancel the move-out notice for {tenantName} at Unit {unitNumber}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Box */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="text-sm text-blue-800">
              <p className="font-medium">What happens when you cancel?</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>The lease will return to active status</li>
                <li>The tenant will be notified of the cancellation</li>
                <li>The move-out date will no longer apply</li>
              </ul>
            </div>
          </div>

          {/* Reason Field */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for Cancellation (optional)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g., Lease renewed, situation resolved, etc."
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
            Keep Notice
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Cancelling..." : "Cancel Notice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
