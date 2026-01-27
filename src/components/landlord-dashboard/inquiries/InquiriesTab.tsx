"use client";

import { useState } from "react";
import { Inbox, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ViewingRequestCard } from "./ViewingRequestCard";
import { ViewingRequestResponseModal } from "./ViewingRequestResponseModal";
import type { ViewingRequestWithDetails, PropertyWithUnits } from "~/types/landlord";

interface InquiriesTabProps {
  requests: ViewingRequestWithDetails[];
  properties: PropertyWithUnits[];
}

export function InquiriesTab({ requests: initialRequests, properties }: InquiriesTabProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<ViewingRequestWithDetails | null>(null);

  const filteredRequests = requests.filter((request) => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesProperty =
      propertyFilter === "all" || request.property.id.toString() === propertyFilter;
    return matchesStatus && matchesProperty;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const handleRequestUpdate = (updatedRequest: ViewingRequestWithDetails) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
    );
    setSelectedRequest(null);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setPropertyFilter("all");
  };

  const hasActiveFilters = statusFilter !== "all" || propertyFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            Viewing Requests
            {pendingCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800">
                {pendingCount} pending
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground">
            Manage viewing requests from prospective tenants
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
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id.toString()}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Request List */}
      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Inbox className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">
            {hasActiveFilters ? "No matching requests" : "No viewing requests"}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Try adjusting your filters"
              : "Viewing requests from prospective tenants will appear here"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request) => (
            <ViewingRequestCard
              key={request.id}
              request={request}
              onRespond={setSelectedRequest}
            />
          ))}
        </div>
      )}

      <ViewingRequestResponseModal
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        request={selectedRequest}
        onUpdate={handleRequestUpdate}
      />
    </div>
  );
}
