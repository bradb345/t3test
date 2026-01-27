"use client";

import { Wrench, AlertCircle, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { MaintenanceRequestWithDetails } from "~/types/landlord";

interface PendingMaintenanceCardProps {
  requests: MaintenanceRequestWithDetails[];
  onViewAll: () => void;
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  emergency: "bg-red-100 text-red-800",
};

export function PendingMaintenanceCard({ requests, onViewAll }: PendingMaintenanceCardProps) {
  const pendingRequests = requests
    .filter((r) => r.status === "pending" || r.status === "in_progress")
    .slice(0, 3);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Wrench className="h-5 w-5" />
          Pending Maintenance
        </CardTitle>
        {requests.filter((r) => r.status === "pending" || r.status === "in_progress").length > 0 && (
          <Badge variant="secondary">
            {requests.filter((r) => r.status === "pending" || r.status === "in_progress").length} active
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-green-100 p-3">
              <Wrench className="h-6 w-6 text-green-600" />
            </div>
            <p className="mt-3 text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground">No pending maintenance requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <div className="flex-shrink-0">
                  {request.priority === "emergency" || request.priority === "high" ? (
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{request.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.property.name} - Unit {request.unit.unitNumber}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={priorityColors[request.priority] ?? "bg-gray-100"}>
                      {request.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(request.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={onViewAll}
            >
              View all requests
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
