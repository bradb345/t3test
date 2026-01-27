"use client";

import { AlertCircle, Clock, CheckCircle2, XCircle, User, Building2 } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { MaintenanceRequestWithDetails } from "~/types/landlord";

interface LandlordMaintenanceCardProps {
  request: MaintenanceRequestWithDetails;
  onUpdateStatus: (request: MaintenanceRequestWithDetails) => void;
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  emergency: "bg-red-100 text-red-800",
};

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  pending: {
    color: "bg-yellow-100 text-yellow-800",
    icon: <Clock className="h-4 w-4" />,
  },
  in_progress: {
    color: "bg-blue-100 text-blue-800",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  completed: {
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  cancelled: {
    color: "bg-gray-100 text-gray-800",
    icon: <XCircle className="h-4 w-4" />,
  },
};

export function LandlordMaintenanceCard({ request, onUpdateStatus }: LandlordMaintenanceCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const statusInfo = statusConfig[request.status] ?? statusConfig.pending;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={priorityColors[request.priority] ?? "bg-gray-100"}>
                {request.priority}
              </Badge>
              <Badge className={statusInfo.color}>
                <span className="mr-1">{statusInfo.icon}</span>
                {request.status.replace("_", " ")}
              </Badge>
            </div>

            <h3 className="mt-2 font-semibold truncate">{request.title}</h3>

            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {request.description}
            </p>

            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {request.property.name} - Unit {request.unit.unitNumber}
              </p>
              <p className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {request.tenant.first_name} {request.tenant.last_name}
              </p>
              <p>Category: {request.category}</p>
              <p>Submitted: {formatDate(request.createdAt)}</p>
              {request.scheduledFor && (
                <p>Scheduled: {formatDate(request.scheduledFor)}</p>
              )}
            </div>

            {request.notes && (
              <div className="mt-2 rounded bg-muted p-2 text-xs">
                <p className="font-medium">Notes:</p>
                <p className="text-muted-foreground">{request.notes}</p>
              </div>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => onUpdateStatus(request)}
          disabled={request.status === "completed"}
        >
          {request.status === "completed" ? "Completed" : "Update Status"}
        </Button>
      </CardContent>
    </Card>
  );
}
