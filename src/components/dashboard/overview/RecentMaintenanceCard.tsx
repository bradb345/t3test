"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Wrench, CheckCircle2 } from "lucide-react";
import type { maintenanceRequests } from "~/server/db/schema";
import {
  maintenanceStatusConfig,
  maintenancePriorityConfig,
} from "~/lib/maintenance-constants";
import { formatDateShort } from "~/lib/date";

type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;

interface RecentMaintenanceCardProps {
  requests: MaintenanceRequest[];
}

export function RecentMaintenanceCard({ requests }: RecentMaintenanceCardProps) {
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
            const status = maintenanceStatusConfig[request.status as keyof typeof maintenanceStatusConfig] ?? maintenanceStatusConfig.pending;
            const priority = maintenancePriorityConfig[request.priority as keyof typeof maintenancePriorityConfig] ?? maintenancePriorityConfig.medium;
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
                    {formatDateShort(request.createdAt)}
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
