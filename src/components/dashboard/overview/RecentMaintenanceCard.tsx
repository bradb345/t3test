"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Wrench, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { maintenanceRequests } from "~/server/db/schema";

type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;

interface RecentMaintenanceCardProps {
  requests: MaintenanceRequest[];
}

const statusConfig = {
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
  },
  in_progress: {
    label: "In Progress",
    variant: "default" as const,
    icon: Wrench,
  },
  completed: {
    label: "Completed",
    variant: "outline" as const,
    icon: CheckCircle2,
  },
};

const priorityConfig = {
  low: { label: "Low", className: "text-green-600" },
  medium: { label: "Medium", className: "text-yellow-600" },
  high: { label: "High", className: "text-orange-600" },
  emergency: { label: "Emergency", className: "text-red-600" },
};

export function RecentMaintenanceCard({ requests }: RecentMaintenanceCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Recent Maintenance
          </CardTitle>
          <CardDescription>Your maintenance requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="mb-2 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">No maintenance requests</p>
            <p className="text-sm text-muted-foreground">
              Everything is running smoothly
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Recent Maintenance
        </CardTitle>
        <CardDescription>Your maintenance requests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => {
            const status = statusConfig[request.status as keyof typeof statusConfig] ?? statusConfig.pending;
            const priority = priorityConfig[request.priority as keyof typeof priorityConfig] ?? priorityConfig.medium;
            const StatusIcon = status.icon;

            return (
              <div
                key={request.id}
                className="flex items-start justify-between gap-4 rounded-lg border p-3"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{request.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="capitalize">{request.category}</span>
                    <span>-</span>
                    <span className={priority.className}>{priority.label}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(request.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
