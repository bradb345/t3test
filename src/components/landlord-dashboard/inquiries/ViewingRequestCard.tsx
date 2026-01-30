"use client";

import { User, Mail, Phone, Calendar, Building2, MessageSquare } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { ViewingRequestWithDetails } from "~/types/landlord";

interface ViewingRequestCardProps {
  request: ViewingRequestWithDetails;
  onRespond: (request: ViewingRequestWithDetails) => void;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
  approved: { color: "bg-green-100 text-green-800", label: "Approved" },
  declined: { color: "bg-red-100 text-red-800", label: "Declined" },
  completed: { color: "bg-blue-100 text-blue-800", label: "Completed" },
};

export function ViewingRequestCard({ request, onRespond }: ViewingRequestCardProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const status = statusConfig[request.status] ?? statusConfig.pending;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Badge className={status.color}>{status.label}</Badge>
          <span className="text-xs text-muted-foreground">
            {formatTime(request.createdAt)}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{request.name}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {request.property.name} - Unit {request.unit.unitNumber}
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Mail className="h-3 w-3" />
            <a href={`mailto:${request.email}`} className="text-primary hover:underline">
              {request.email}
            </a>
          </p>
          {request.phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-3 w-3" />
              <a href={`tel:${request.phone}`} className="text-primary hover:underline">
                {request.phone}
              </a>
            </p>
          )}
          {request.preferredDate && (
            <p className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Preferred: {formatDate(request.preferredDate)}
              {request.preferredTime && ` at ${request.preferredTime}`}
            </p>
          )}
        </div>

        {request.message && (
          <div className="mt-3 rounded bg-muted p-2">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              Message
            </p>
            <p className="mt-1 text-sm line-clamp-2">{request.message}</p>
          </div>
        )}

        {request.landlordNotes && request.status !== "pending" && (
          <div className="mt-2 rounded bg-blue-50 p-2">
            <p className="text-xs font-medium text-blue-800">Your Response</p>
            <p className="mt-1 text-sm text-blue-700">{request.landlordNotes}</p>
          </div>
        )}

        <Button
          variant={request.status === "pending" ? "default" : "outline"}
          size="sm"
          className="mt-3 w-full"
          onClick={() => onRespond(request)}
        >
          {request.status === "pending" ? "Respond" : "View Details"}
        </Button>
      </CardContent>
    </Card>
  );
}
