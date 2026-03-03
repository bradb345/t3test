"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Eye,
  Building2,
  User,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";
import { trackClientEvent } from "~/lib/posthog-events/client";
import type { DocumentWithDetails } from "~/types/landlord";

interface PropertyDocumentsSectionProps {
  documents: DocumentWithDetails[];
  onDocumentUpdated: (doc: DocumentWithDetails) => void;
}

const documentTypeLabels: Record<string, string> = {
  government_id: "Government ID",
  proof_of_income: "Proof of Income",
  employment_verification: "Employment Verification",
  rental_history: "Rental History",
  bank_statement: "Bank Statement",
  reference_letter: "Reference Letter",
  proof_of_address: "Proof of Address",
  pay_stub: "Pay Stub",
  other: "Other Document",
};

const statusColors: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function PropertyDocumentsSection({
  documents,
  onDocumentUpdated,
}: PropertyDocumentsSectionProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Group documents by property
  const documentsByProperty = documents.reduce(
    (acc, doc) => {
      const propertyKey = doc.property?.name ?? "Unassigned";
      if (!acc[propertyKey]) {
        acc[propertyKey] = [];
      }
      acc[propertyKey].push(doc);
      return acc;
    },
    {} as Record<string, DocumentWithDetails[]>
  );

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg font-medium">No documents</p>
        <p className="text-sm text-muted-foreground">
          Tenant documents will appear here once uploaded
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(documentsByProperty).map(([propertyName, propertyDocs]) => (
        <Card key={propertyName}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              {propertyName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {propertyDocs.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  onDocumentUpdated={onDocumentUpdated}
                  formatDate={formatDate}
                  formatFileSize={formatFileSize}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface DocumentRowProps {
  doc: DocumentWithDetails;
  onDocumentUpdated: (doc: DocumentWithDetails) => void;
  formatDate: (date: Date) => string;
  formatFileSize: (bytes: number | null) => string;
}

function DocumentRow({
  doc,
  onDocumentUpdated,
  formatDate,
  formatFileSize,
}: DocumentRowProps) {
  const posthog = usePostHog();
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  const handleAction = async (status: "approved" | "rejected", notes?: string) => {
    setIsLoading(true);
    trackClientEvent(posthog, "document_verification_action_clicked", {
      document_id: doc.id,
      action: status === "approved" ? "approve" : "reject",
    });

    try {
      const response = await fetch(`/api/landlord/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error ?? "Failed to update document");
      }

      const data = (await response.json()) as { document: DocumentWithDetails };
      onDocumentUpdated({ ...doc, ...data.document });
      toast.success(
        status === "approved"
          ? "Document approved successfully"
          : "Document rejected successfully"
      );
      setShowRejectForm(false);
      setRejectNotes("");
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update document"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isPending = doc.status === "pending_review";

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{doc.fileName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{documentTypeLabels[doc.documentType] ?? doc.documentType}</span>
              <span>|</span>
              <span>{formatFileSize(doc.fileSize)}</span>
              <span>|</span>
              <span>{formatDate(doc.uploadedAt)}</span>
            </div>
            {doc.tenant && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {doc.tenant.first_name} {doc.tenant.last_name}
                {doc.unit && ` - Unit ${doc.unit.unitNumber}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[doc.status] ?? "bg-gray-100"}>
            {doc.status.replace("_", " ")}
          </Badge>
          {isPending && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => handleAction("approved")}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowRejectForm(!showRejectForm)}
                disabled={isLoading}
              >
                <XCircle className="mr-1 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" asChild>
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" aria-label="View document">
              <Eye className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href={doc.fileUrl} download={doc.fileName} aria-label={`Download ${doc.fileName}`}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
      {showRejectForm && (
        <div className="mt-3 ml-13 space-y-2">
          <Textarea
            placeholder="Optional rejection notes (e.g., 'Image is too blurry')"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={2}
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleAction("rejected", rejectNotes)}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Confirm Reject"
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowRejectForm(false);
                setRejectNotes("");
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
