"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Calendar, Image as ImageIcon } from "lucide-react";
import type { maintenanceRequests } from "~/server/db/schema";
import {
  maintenanceStatusConfig,
  maintenancePriorityBadgeConfig,
  maintenanceCategoryLabels,
} from "~/lib/maintenance-constants";
import { formatDate } from "~/lib/date";

type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;

interface MaintenanceRequestCardProps {
  request: MaintenanceRequest;
}

export function MaintenanceRequestCard({ request }: MaintenanceRequestCardProps) {
  const status = maintenanceStatusConfig[request.status as keyof typeof maintenanceStatusConfig] ?? maintenanceStatusConfig.pending;
  const priority = maintenancePriorityBadgeConfig[request.priority as keyof typeof maintenancePriorityBadgeConfig] ?? maintenancePriorityBadgeConfig.medium;
  const StatusIcon = status.icon;

  // Parse imageUrls if they exist
  let images: string[] = [];
  if (request.imageUrls) {
    try {
      images = JSON.parse(request.imageUrls) as string[];
    } catch {
      // Ignore parse errors
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{request.title}</CardTitle>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          <span className="capitalize">
            {maintenanceCategoryLabels[request.category] ?? request.category}
          </span>
          <span>-</span>
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${priority.className}`}>
            {priority.label} Priority
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {request.description}
        </p>

        {images.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
            <span>{images.length} photo{images.length !== 1 ? "s" : ""} attached</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Submitted {formatDate(request.createdAt)}</span>
          </div>
          {request.scheduledFor && (
            <span>
              Scheduled: {formatDate(request.scheduledFor)}
            </span>
          )}
        </div>

        {request.notes && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Notes from property management:</p>
            <p className="mt-1 text-muted-foreground">{request.notes}</p>
          </div>
        )}

        {request.completedAt && (
          <div className="text-sm text-green-600 dark:text-green-400">
            Completed on {formatDate(request.completedAt)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
