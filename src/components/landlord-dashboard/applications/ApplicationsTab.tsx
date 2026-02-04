"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Loader2, FileText, Filter } from "lucide-react";
import { ApplicationCard } from "./ApplicationCard";
import { ApplicationReviewModal } from "./ApplicationReviewModal";
import type { TenancyApplicationWithDetails } from "~/types/landlord";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export function ApplicationsTab() {
  const [applications, setApplications] = useState<
    TenancyApplicationWithDetails[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedApplication, setSelectedApplication] =
    useState<TenancyApplicationWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchApplications = useCallback(async () => {
    try {
      const response = await fetch("/api/landlord/applications");
      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }
      const data = (await response.json()) as {
        applications: TenancyApplicationWithDetails[];
      };
      setApplications(data.applications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  const handleViewDetails = (application: TenancyApplicationWithDetails) => {
    setSelectedApplication(application);
    setIsModalOpen(true);
  };

  const handleReviewComplete = () => {
    // Refresh the list after a review
    void fetchApplications();
  };

  const filteredApplications =
    statusFilter === "all"
      ? applications
      : applications.filter((app) => app.status === statusFilter);

  const pendingCount = applications.filter(
    (app) => app.status === "pending"
  ).length;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-500">{error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setError(null);
            setIsLoading(true);
            void fetchApplications();
          }}
          className="mt-4"
        >
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tenancy Applications</h2>
          <p className="text-muted-foreground">
            {pendingCount > 0 ? (
              <>
                <span className="font-semibold text-primary">
                  {pendingCount}
                </span>{" "}
                application{pendingCount !== 1 ? "s" : ""} pending review
              </>
            ) : (
              "Review and manage applications for your properties"
            )}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No Applications</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {statusFilter === "all"
              ? "You haven't received any tenancy applications yet. When someone applies to rent one of your units, they will appear here."
              : `No ${statusFilter} applications found.`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Review Modal */}
      <ApplicationReviewModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedApplication(null);
        }}
        application={selectedApplication}
        onReviewComplete={handleReviewComplete}
      />
    </div>
  );
}
