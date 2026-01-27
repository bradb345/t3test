"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_TRANSITIONS,
} from "~/lib/constants/maintenance";
import type { MaintenanceRequestWithDetails } from "~/types/landlord";

interface MaintenanceStatusUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequestWithDetails | null;
  onUpdate: (updatedRequest: MaintenanceRequestWithDetails) => void;
}

export function MaintenanceStatusUpdateModal({
  open,
  onOpenChange,
  request,
  onUpdate,
}: MaintenanceStatusUpdateModalProps) {
  const [status, setStatus] = useState(request?.status ?? "pending");
  const [notes, setNotes] = useState(request?.notes ?? "");
  const [scheduledFor, setScheduledFor] = useState(
    request?.scheduledFor
      ? new Date(request.scheduledFor).toISOString().slice(0, 16)
      : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens with new request
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && request) {
      setStatus(request.status);
      setNotes(request.notes ?? "");
      setScheduledFor(
        request.scheduledFor
          ? new Date(request.scheduledFor).toISOString().slice(0, 16)
          : ""
      );
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!request) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/landlord/maintenance/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes: notes.trim() || null,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Failed to update request");
      }

      const updatedRequest = (await response.json()) as Partial<MaintenanceRequestWithDetails>;

      // Merge the updated data with the existing details
      onUpdate({
        ...request,
        ...updatedRequest,
      });

      // Trigger notification refresh to update the notification bell
      window.dispatchEvent(new CustomEvent("refresh-notifications"));

      toast.success("Maintenance request updated");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating maintenance request:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) return null;

  const allowedTransitions = MAINTENANCE_STATUS_TRANSITIONS[request.status] ?? [];
  const canChangeStatus = allowedTransitions.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Maintenance Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request Summary */}
          <div className="rounded-lg border p-3">
            <h4 className="font-medium">{request.title}</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {request.property.name} - Unit {request.unit.unitNumber}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline">{request.category}</Badge>
              <Badge variant="outline">{request.priority}</Badge>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            {canChangeStatus ? (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={request.status}>
                    {MAINTENANCE_STATUSES.find((s) => s.value === request.status)?.label ??
                      request.status}
                  </SelectItem>
                  {allowedTransitions.map((transitionStatus) => (
                    <SelectItem key={transitionStatus} value={transitionStatus}>
                      {MAINTENANCE_STATUSES.find((s) => s.value === transitionStatus)?.label ??
                        transitionStatus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                This request is {request.status.replace("_", " ")} and cannot be changed.
              </p>
            )}
          </div>

          {/* Scheduled Date */}
          {(status === "pending" || status === "in_progress") && (
            <div className="space-y-2">
              <Label htmlFor="scheduledFor" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule Date/Time (optional)
              </Label>
              <Input
                id="scheduledFor"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this request..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
