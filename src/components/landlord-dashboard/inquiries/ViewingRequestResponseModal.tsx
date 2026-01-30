"use client";

import { useState } from "react";
import { User, Mail, Phone, Calendar, Building2 } from "lucide-react";
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
import { Separator } from "~/components/ui/separator";
import { toast } from "sonner";
import type { ViewingRequestWithDetails } from "~/types/landlord";

interface ViewingRequestResponseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ViewingRequestWithDetails | null;
  onUpdate: (updatedRequest: ViewingRequestWithDetails) => void;
}

export function ViewingRequestResponseModal({
  open,
  onOpenChange,
  request,
  onUpdate,
}: ViewingRequestResponseModalProps) {
  const [notes, setNotes] = useState(request?.landlordNotes ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && request) {
      setNotes(request.landlordNotes ?? "");
    }
    onOpenChange(newOpen);
  };

  const handleResponse = async (status: "approved" | "declined" | "completed") => {
    if (!request) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/landlord/inquiries/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          landlordNotes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Failed to update request");
      }

      const updatedRequest = (await response.json()) as Partial<ViewingRequestWithDetails>;
      onUpdate({
        ...request,
        ...updatedRequest,
      });

      const messages = {
        approved: "Viewing request approved",
        declined: "Viewing request declined",
        completed: "Viewing marked as completed",
      };
      toast.success(messages[status]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating viewing request:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) return null;

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const isPending = request.status === "pending";
  const isApproved = request.status === "approved";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Viewing Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Requester Info */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{request.name}</h3>
              <p className="text-sm text-muted-foreground">
                Prospective Tenant
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${request.email}`} className="text-primary hover:underline">
                {request.email}
              </a>
            </p>
            {request.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${request.phone}`} className="text-primary hover:underline">
                  {request.phone}
                </a>
              </p>
            )}
          </div>

          <Separator />

          {/* Property Info */}
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4" />
              {request.property.name}
            </p>
            <p className="ml-6 text-sm text-muted-foreground">
              Unit {request.unit.unitNumber}
            </p>
          </div>

          {/* Preferred Date/Time */}
          {request.preferredDate && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Preferred Viewing Time
              </p>
              <p className="ml-6 text-sm text-muted-foreground">
                {formatDate(request.preferredDate)}
                {request.preferredTime && ` at ${request.preferredTime}`}
              </p>
            </div>
          )}

          {/* Message */}
          {request.message && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Message from Requester</Label>
              <div className="rounded-lg bg-muted p-3 text-sm">
                {request.message}
              </div>
            </div>
          )}

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {isPending ? "Your Response (optional)" : "Your Notes"}
            </Label>
            <Textarea
              id="notes"
              placeholder="Add a message or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={!isPending && !isApproved}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isPending && (
            <>
              <Button
                variant="outline"
                onClick={() => handleResponse("declined")}
                disabled={isSubmitting}
                className="flex-1"
              >
                Decline
              </Button>
              <Button
                onClick={() => handleResponse("approved")}
                disabled={isSubmitting}
                className="flex-1"
              >
                Approve
              </Button>
            </>
          )}
          {isApproved && (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={() => handleResponse("completed")}
                disabled={isSubmitting}
                className="flex-1"
              >
                Mark Completed
              </Button>
            </>
          )}
          {!isPending && !isApproved && (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
