"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { MaintenanceRequestCard } from "./MaintenanceRequestCard";
import { MaintenanceStatusFilter } from "./MaintenanceStatusFilter";
import { CreateMaintenanceModal } from "./CreateMaintenanceModal";
import type { maintenanceRequests } from "~/server/db/schema";

type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;

interface MaintenanceTabProps {
  requests: MaintenanceRequest[];
  unitId: number;
}

export function MaintenanceTab({ requests: initialRequests, unitId }: MaintenanceTabProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredRequests =
    filter === "all"
      ? requests
      : requests.filter((r) => r.status === filter);

  const handleRequestCreated = (newRequest: MaintenanceRequest) => {
    setRequests((prev) => [newRequest, ...prev]);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Maintenance Requests
          </h2>
          <p className="text-muted-foreground">
            Submit and track maintenance requests for your unit
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      <MaintenanceStatusFilter
        currentFilter={filter}
        onFilterChange={setFilter}
        counts={{
          all: requests.length,
          pending: requests.filter((r) => r.status === "pending").length,
          in_progress: requests.filter((r) => r.status === "in_progress").length,
          completed: requests.filter((r) => r.status === "completed").length,
        }}
      />

      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-lg font-medium">No maintenance requests</p>
          <p className="text-sm text-muted-foreground">
            {filter === "all"
              ? "You haven't submitted any maintenance requests yet"
              : `No ${filter.replace("_", " ")} requests`}
          </p>
          {filter === "all" && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create your first request
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredRequests.map((request) => (
            <MaintenanceRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}

      <CreateMaintenanceModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        unitId={unitId}
        onRequestCreated={handleRequestCreated}
      />
    </div>
  );
}
