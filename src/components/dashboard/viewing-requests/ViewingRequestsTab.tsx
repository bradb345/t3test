"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Eye, Calendar, MapPin } from "lucide-react";
import type {
  viewingRequests,
  units,
  properties,
} from "~/server/db/schema";

type ViewingRequest = typeof viewingRequests.$inferSelect;
type Unit = typeof units.$inferSelect;
type Property = typeof properties.$inferSelect;

interface ViewingRequestWithDetails {
  viewingRequest: ViewingRequest;
  unit: Unit;
  property: Property;
}

interface ViewingRequestsTabProps {
  viewingRequests: ViewingRequestWithDetails[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  declined: { label: "Declined", variant: "destructive" },
  completed: { label: "Completed", variant: "outline" },
};

export function ViewingRequestsTab({ viewingRequests }: ViewingRequestsTabProps) {
  if (viewingRequests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Eye className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-semibold">No viewing requests yet</h3>
          <p className="text-center text-sm text-muted-foreground">
            When you request to view a property, it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Viewing Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {viewingRequests.map(({ viewingRequest, unit, property }) => {
              const config = statusConfig[viewingRequest.status] ?? statusConfig.pending!;
              return (
                <Link
                  key={viewingRequest.id}
                  href={`/units/${unit.id}`}
                  className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">
                          Unit {unit.unitNumber}
                        </h4>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {property.name} — {property.address}
                      </div>
                      {viewingRequest.preferredDate && (
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          Preferred: {new Date(viewingRequest.preferredDate).toLocaleDateString()}
                          {viewingRequest.preferredTime ? ` at ${viewingRequest.preferredTime}` : ""}
                        </div>
                      )}
                      {viewingRequest.landlordNotes && (
                        <p className="mt-2 text-sm italic text-muted-foreground">
                          Landlord notes: &ldquo;{viewingRequest.landlordNotes}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      {new Date(viewingRequest.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
