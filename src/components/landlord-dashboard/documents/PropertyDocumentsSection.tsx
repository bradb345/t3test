"use client";

import { FileText, Download, Eye, Building2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { DocumentWithDetails } from "~/types/landlord";

interface PropertyDocumentsSectionProps {
  documents: DocumentWithDetails[];
}

const documentTypeLabels: Record<string, string> = {
  government_id: "Government ID",
  proof_of_income: "Proof of Income",
  employment_verification: "Employment Verification",
  rental_history: "Rental History",
  bank_statement: "Bank Statement",
  reference_letter: "Reference Letter",
  other: "Other Document",
};

const statusColors: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function PropertyDocumentsSection({ documents }: PropertyDocumentsSectionProps) {
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
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
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
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.fileUrl} download={doc.fileName}>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
