"use client";

import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Mail, Phone, Eye, MapPin } from "lucide-react";
import { formatCurrency } from "~/lib/currency";

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
import type { TenancyApplicationWithDetails } from "~/types/landlord";

interface ApplicationCardProps {
  application: TenancyApplicationWithDetails;
  onViewDetails: (application: TenancyApplicationWithDetails) => void;
}

export function ApplicationCard({
  application,
  onViewDetails,
}: ApplicationCardProps) {
  const initials = application.applicant.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Rejected
          </Badge>
        );
      case "withdrawn":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            Withdrawn
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Applicant Info */}
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={application.applicant.imageUrl ?? undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{application.applicant.name}</h3>
              {getStatusBadge(application.status)}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {application.applicant.email}
              </span>
              {application.applicant.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {application.applicant.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(application)}
          className="w-full sm:w-auto"
        >
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </div>

      {/* Property Info */}
      <div className="mt-4 rounded-lg bg-muted/50 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">
              Unit {application.unit.unitNumber} at {application.property.name}
            </p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {application.property.address}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-primary">
              {formatCurrency(
                parseFloat(application.unit.monthlyRent),
                application.unit.currency
              )}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / month
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Submission Info */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>Submitted {formatRelativeTime(application.submittedAt)}</span>
        {application.reviewedAt && (
          <span>Reviewed {formatRelativeTime(application.reviewedAt)}</span>
        )}
      </div>
    </Card>
  );
}
