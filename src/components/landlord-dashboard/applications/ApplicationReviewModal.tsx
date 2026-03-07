"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Loader2,
  CheckCircle,
  XCircle,
  User,
  Briefcase,
  FileText,
  Phone,
  ExternalLink,
  History,
} from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import type { TenancyApplicationWithDetails } from "~/types/landlord";

interface LeasePaymentStats {
  total: number;
  completed: number;
  late: number;
  failed: number;
}

interface LeaseHistoryEntry {
  leaseId: number;
  propertyName: string;
  unitNumber: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: string;
  currency: string;
  status: string;
  delinquent: boolean;
  paymentStats: LeasePaymentStats;
}

interface ApplicationReviewModalProps {
  open: boolean;
  onClose: () => void;
  application: TenancyApplicationWithDetails | null;
  onReviewComplete: () => void;
}

interface ApplicationData {
  personal?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
  };
  employment?: {
    employerName?: string;
    employerPhone?: string;
    employerAddress?: string;
    employmentType?: string;
    salary?: string;
  };
  emergencyContact?: {
    emergencyContactName?: string;
    emergencyContactRelationship?: string;
    emergencyContactPhone?: string;
    emergencyContactEmail?: string;
  };
  proofOfAddress?: {
    proofOfAddressFileName?: string;
    proofOfAddressUrl?: string;
  };
  photoId?: {
    photoIdFileName?: string;
    photoIdUrl?: string;
  };
}

export function ApplicationReviewModal({
  open,
  onClose,
  application,
  onReviewComplete,
}: ApplicationReviewModalProps) {
  const [fullApplicationData, setFullApplicationData] =
    useState<ApplicationData | null>(null);
  const [platformHistory, setPlatformHistory] = useState<LeaseHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [rentDueDay, setRentDueDay] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && application) {
      setIsLoading(true);
      setError(null);
      setDecisionNotes("");

      fetch(`/api/landlord/applications/${application.id}`)
        .then((res) => res.json())
        .then(
          (data: {
            application: { applicationData: ApplicationData | null };
            platformHistory?: LeaseHistoryEntry[];
          }) => {
            setFullApplicationData(data.application.applicationData);
            setPlatformHistory(data.platformHistory ?? []);
          }
        )
        .catch(() => {
          setError("Failed to load application details");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, application]);

  const handleDecision = async (decision: "approved" | "rejected") => {
    if (!application) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/landlord/applications/${application.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            decisionNotes: decisionNotes.trim() || undefined,
            ...(decision === "approved" && { rentDueDay }),
          }),
        }
      );

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error || "Failed to process decision");
      }

      onReviewComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!application) return null;

  const initials = application.applicant.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const isPending = application.status === "pending";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Application Review</DialogTitle>
          <DialogDescription>
            Review the applicant&apos;s information and make a decision.
          </DialogDescription>
        </DialogHeader>

        {/* Applicant Header */}
        <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={application.applicant.imageUrl ?? undefined} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">
              {application.applicant.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {application.applicant.email}
            </p>
            <p className="mt-1 text-sm">
              Applying for{" "}
              <strong>
                Unit {application.unit.unitNumber} at{" "}
                {application.property.name}
              </strong>
            </p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(
                parseFloat(application.unit.monthlyRent),
                application.unit.currency
              )}{" "}
              / month
            </p>
          </div>
          <Badge
            variant={
              application.status === "pending"
                ? "secondary"
                : application.status === "approved"
                  ? "default"
                  : "destructive"
            }
          >
            {application.status}
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        ) : (
          <>
            {/* Application Details Tabs */}
            <Tabs defaultValue="personal" className="mt-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="personal" className="text-xs sm:text-sm">
                  <User className="mr-1 h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Personal</span>
                </TabsTrigger>
                <TabsTrigger value="employment" className="text-xs sm:text-sm">
                  <Briefcase className="mr-1 h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Employment</span>
                </TabsTrigger>
                <TabsTrigger value="emergency" className="text-xs sm:text-sm">
                  <Phone className="mr-1 h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Emergency</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs sm:text-sm">
                  <FileText className="mr-1 h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Documents</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs sm:text-sm">
                  <History className="mr-1 h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">History</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">First Name</p>
                    <p className="font-medium">
                      {fullApplicationData?.personal?.firstName ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Name</p>
                    <p className="font-medium">
                      {fullApplicationData?.personal?.lastName ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">
                      {fullApplicationData?.personal?.email ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">
                      {fullApplicationData?.personal?.phone ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">
                      {fullApplicationData?.personal?.dateOfBirth ?? "N/A"}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="employment" className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Employer</p>
                    <p className="font-medium">
                      {fullApplicationData?.employment?.employerName ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">
                      {fullApplicationData?.employment?.employerPhone ?? "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {fullApplicationData?.employment?.employerAddress ??
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Employment Type</p>
                    <p className="font-medium capitalize">
                      {fullApplicationData?.employment?.employmentType?.replace(
                        "_",
                        "-"
                      ) ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Monthly Salary</p>
                    <p className="font-medium">
                      {fullApplicationData?.employment?.salary ?? "N/A"}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="emergency" className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Contact Name</p>
                    <p className="font-medium">
                      {fullApplicationData?.emergencyContact
                        ?.emergencyContactName ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Relationship</p>
                    <p className="font-medium">
                      {fullApplicationData?.emergencyContact
                        ?.emergencyContactRelationship ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">
                      {fullApplicationData?.emergencyContact
                        ?.emergencyContactPhone ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">
                      {fullApplicationData?.emergencyContact
                        ?.emergencyContactEmail ?? "N/A"}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-4 space-y-4">
                <div className="space-y-3">
                  <div className="rounded-lg border p-4">
                    <p className="mb-2 text-sm font-medium">Proof of Address</p>
                    {fullApplicationData?.proofOfAddress?.proofOfAddressUrl ? (
                      <a
                        href={
                          fullApplicationData.proofOfAddress.proofOfAddressUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {fullApplicationData.proofOfAddress
                          .proofOfAddressFileName ?? "View Document"}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Not uploaded
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="mb-2 text-sm font-medium">Photo ID</p>
                    {fullApplicationData?.photoId?.photoIdUrl ? (
                      <a
                        href={fullApplicationData.photoId.photoIdUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {fullApplicationData.photoId.photoIdFileName ??
                          "View Document"}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Not uploaded
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-4 space-y-4">
                {platformHistory.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <History className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 font-medium">New to Platform</p>
                    <p className="text-sm text-muted-foreground">
                      This applicant has no prior lease history on the platform.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Summary row */}
                    <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="text-center">
                        <p className="text-lg font-semibold">{platformHistory.length}</p>
                        <p className="text-muted-foreground">Past Leases</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold">
                          {platformHistory.some((l) => l.delinquent) ? (
                            <span className="text-red-600">Yes</span>
                          ) : (
                            <span className="text-green-600">No</span>
                          )}
                        </p>
                        <p className="text-muted-foreground">Delinquency</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold">
                          {(() => {
                            const totals = platformHistory.reduce(
                              (acc, l) => ({
                                completed: acc.completed + l.paymentStats.completed,
                                total: acc.total + l.paymentStats.total,
                              }),
                              { completed: 0, total: 0 }
                            );
                            return totals.total > 0
                              ? `${Math.round((totals.completed / totals.total) * 100)}%`
                              : "N/A";
                          })()}
                        </p>
                        <p className="text-muted-foreground">On-Time Rate</p>
                      </div>
                    </div>

                    {/* Per-lease cards */}
                    <div className="space-y-3">
                      {platformHistory.map((lease) => (
                        <div key={lease.leaseId} className="rounded-lg border p-4 text-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">
                                {lease.propertyName} — Unit {lease.unitNumber}
                              </p>
                              <p className="text-muted-foreground">
                                {new Date(lease.leaseStart).toLocaleDateString("en-US", {
                                  month: "short",
                                  year: "numeric",
                                })}
                                {" – "}
                                {new Date(lease.leaseEnd).toLocaleDateString("en-US", {
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {lease.delinquent && (
                                <Badge variant="destructive" className="text-xs">
                                  Delinquent
                                </Badge>
                              )}
                              <Badge
                                variant={
                                  lease.status === "active"
                                    ? "default"
                                    : lease.status === "terminated"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="capitalize text-xs"
                              >
                                {lease.status.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-4 gap-2 rounded bg-muted/30 p-2 text-center text-xs">
                            <div>
                              <p className="font-medium">
                                {formatCurrency(parseFloat(lease.monthlyRent), lease.currency)}
                              </p>
                              <p className="text-muted-foreground">Rent</p>
                            </div>
                            <div>
                              <p className="font-medium">{lease.paymentStats.total}</p>
                              <p className="text-muted-foreground">Payments</p>
                            </div>
                            <div>
                              <p className="font-medium text-green-600">
                                {lease.paymentStats.completed}
                              </p>
                              <p className="text-muted-foreground">On Time</p>
                            </div>
                            <div>
                              <p className="font-medium text-red-600">
                                {lease.paymentStats.late + lease.paymentStats.failed}
                              </p>
                              <p className="text-muted-foreground">Late/Failed</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Decision Section */}
            {isPending && (
              <div className="mt-6 space-y-4 border-t pt-6">
                <div className="space-y-2">
                  <Label htmlFor="decisionNotes">
                    Notes (optional - will be shared with applicant if rejected)
                  </Label>
                  <Textarea
                    id="decisionNotes"
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="Add any notes about your decision..."
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rentDueDay">Rent Due Day (1-28)</Label>
                  <select
                    id="rentDueDay"
                    value={rentDueDay}
                    onChange={(e) => setRentDueDay(Number(e.target.value))}
                    disabled={isSubmitting}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                    onClick={() => handleDecision("rejected")}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    Reject
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleDecision("approved")}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Approve
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Approving will create a lease in pending signature status. You are
                  responsible for providing and executing the lease agreement
                  with your tenant outside of this platform. Once the lease is
                  signed, confirm it from the Tenants tab to activate the lease
                  and trigger the move-in payment.
                </p>
              </div>
            )}

            {/* Already reviewed message */}
            {!isPending && (
              <div className="mt-6 rounded-lg bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  This application was{" "}
                  <strong className="capitalize">{application.status}</strong>
                  {application.reviewedAt &&
                    ` on ${new Date(
                      typeof application.reviewedAt === "string"
                        ? application.reviewedAt
                        : application.reviewedAt
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}`}
                </p>
                {application.decisionNotes && (
                  <p className="mt-2 text-sm">
                    Notes: {application.decisionNotes}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
