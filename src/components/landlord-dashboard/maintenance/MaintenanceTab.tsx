"use client";

import { useState } from "react";
import { Wrench, Filter } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { LandlordMaintenanceCard } from "./LandlordMaintenanceCard";
import { MaintenanceStatusUpdateModal } from "./MaintenanceStatusUpdateModal";
import { MAINTENANCE_STATUSES, MAINTENANCE_PRIORITIES } from "~/lib/constants/maintenance";
import type { MaintenanceRequestWithDetails } from "~/types/landlord";

interface MaintenanceTabProps {
  requests: MaintenanceRequestWithDetails[];
}

export function MaintenanceTab({ requests: initialRequests }: MaintenanceTabProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestWithDetails | null>(null);

  const filteredRequests = requests.filter((request) => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  // Count by status
  const statusCounts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    in_progress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
    cancelled: requests.filter((r) => r.status === "cancelled").length,
  };

  const handleRequestUpdate = (updatedRequest: MaintenanceRequestWithDetails) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
    );
    setSelectedRequest(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Maintenance Requests</h2>
          <p className="text-muted-foreground">
            View and manage maintenance requests across all properties
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
            {MAINTENANCE_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label} ({statusCounts[status.value as keyof typeof statusCounts] ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {MAINTENANCE_PRIORITIES.map((priority) => (
              <SelectItem key={priority.value} value={priority.value}>
                {priority.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || priorityFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setPriorityFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Request List */}
      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Wrench className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No maintenance requests</p>
          <p className="text-sm text-muted-foreground">
            {statusFilter !== "all" || priorityFilter !== "all"
              ? "Try adjusting your filters"
              : "No maintenance requests have been submitted"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request) => (
            <LandlordMaintenanceCard
              key={request.id}
              request={request}
              onUpdateStatus={setSelectedRequest}
            />
          ))}
        </div>
      )}

      <MaintenanceStatusUpdateModal
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        request={selectedRequest}
        onUpdate={handleRequestUpdate}
      />
    </div>
  );
}
