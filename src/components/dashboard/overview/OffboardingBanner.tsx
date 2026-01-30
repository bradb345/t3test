"use client";

import { useState } from "react";
import { LogOut, AlertTriangle, XCircle, Calendar } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { getDaysUntilMoveOut, formatMoveOutDate } from "~/lib/offboarding";
import type { OffboardingNotice } from "~/types/offboarding";

interface OffboardingBannerProps {
  notice: OffboardingNotice;
  unitNumber: string;
  propertyName: string;
  onCancelled?: () => void;
}

export function OffboardingBanner({
  notice,
  unitNumber,
  propertyName,
  onCancelled,
}: OffboardingBannerProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daysLeft = getDaysUntilMoveOut(new Date(notice.moveOutDate));
  const isUrgent = daysLeft <= 14;
  const canCancel = notice.status === "active" && notice.initiatedBy === "tenant";

  const handleCancel = async () => {
    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/offboarding/${notice.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancellationReason: cancelReason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? "Failed to cancel notice");
      }

      setShowCancelModal(false);
      setCancelReason("");
      onCancelled?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <div
        className={`col-span-full rounded-lg border-2 p-6 ${
          isUrgent
            ? "border-red-300 bg-red-50"
            : "border-orange-300 bg-orange-50"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
                isUrgent ? "bg-red-100" : "bg-orange-100"
              }`}
            >
              {isUrgent ? (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              ) : (
                <LogOut className="h-6 w-6 text-orange-600" />
              )}
            </div>
            <div>
              <h3
                className={`text-lg font-semibold ${
                  isUrgent ? "text-red-900" : "text-orange-900"
                }`}
              >
                Move-Out Notice Active
              </h3>
              <p
                className={`mt-1 ${isUrgent ? "text-red-700" : "text-orange-700"}`}
              >
                {notice.initiatedBy === "tenant"
                  ? "You have given notice to vacate"
                  : "Your landlord has given notice for you to vacate"}{" "}
                Unit {unitNumber} at {propertyName}.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar
                    className={`h-5 w-5 ${isUrgent ? "text-red-600" : "text-orange-600"}`}
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        isUrgent ? "text-red-800" : "text-orange-800"
                      }`}
                    >
                      Move-Out Date
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        isUrgent ? "text-red-900" : "text-orange-900"
                      }`}
                    >
                      {formatMoveOutDate(new Date(notice.moveOutDate))}
                    </p>
                  </div>
                </div>

                <div
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    isUrgent
                      ? "bg-red-200 text-red-800"
                      : "bg-orange-200 text-orange-800"
                  }`}
                >
                  {daysLeft} days remaining
                </div>
              </div>

              {notice.reason && (
                <p
                  className={`mt-3 text-sm italic ${
                    isUrgent ? "text-red-600" : "text-orange-600"
                  }`}
                >
                  Reason: &ldquo;{notice.reason}&rdquo;
                </p>
              )}
            </div>
          </div>

          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="mr-1 h-4 w-4" />
              Cancel Notice
            </Button>
          )}
        </div>

        {/* Next Steps */}
        <div className="mt-6 border-t border-orange-200 pt-4">
          <h4
            className={`text-sm font-medium ${
              isUrgent ? "text-red-800" : "text-orange-800"
            }`}
          >
            Next Steps
          </h4>
          <ul
            className={`mt-2 list-inside list-disc space-y-1 text-sm ${
              isUrgent ? "text-red-700" : "text-orange-700"
            }`}
          >
            <li>Begin preparing for your move</li>
            <li>Schedule a move-out inspection with your landlord</li>
            <li>Ensure the unit is in good condition for deposit return</li>
            <li>Update your address with relevant parties</li>
          </ul>
        </div>
      </div>

      {/* Cancel Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Cancel Move-Out Notice
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your move-out notice? Your lease
              will return to active status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">
                Reason for Cancellation (optional)
              </Label>
              <Textarea
                id="cancel-reason"
                placeholder="e.g., Change of plans, renewed lease, etc."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={isCancelling}
            >
              Keep Notice
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Cancel Notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
