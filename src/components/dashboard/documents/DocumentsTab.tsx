"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { FileText, Upload, File, ExternalLink } from "lucide-react";
import { DocumentCard } from "./DocumentCard";
import { DocumentUploadModal } from "./DocumentUploadModal";
import type {
  leases,
  units,
  properties,
  tenantDocuments,
} from "~/server/db/schema";

type Lease = typeof leases.$inferSelect;
type Unit = typeof units.$inferSelect;
type Property = typeof properties.$inferSelect;
type TenantDocument = typeof tenantDocuments.$inferSelect;

interface LeaseWithDetails {
  lease: Lease;
  unit: Unit;
  property: Property;
}

interface DocumentsTabProps {
  lease: LeaseWithDetails;
  tenantDocuments: TenantDocument[];
  profileId: number | null;
}

interface LeaseDocument {
  url: string;
  name: string;
}

export function DocumentsTab({
  lease,
  tenantDocuments: initialDocuments,
  profileId,
}: DocumentsTabProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Parse lease documents
  let leaseDocuments: LeaseDocument[] = [];
  if (lease.lease.documents) {
    try {
      const parsed = JSON.parse(lease.lease.documents);
      if (Array.isArray(parsed)) {
        leaseDocuments = parsed.map((url: string, index: number) => ({
          url,
          name: `Lease Document ${index + 1}`,
        }));
      }
    } catch {
      // If it's a single URL string
      if (typeof lease.lease.documents === "string" && lease.lease.documents.startsWith("http")) {
        leaseDocuments = [{ url: lease.lease.documents, name: "Lease Agreement" }];
      }
    }
  }

  const handleDocumentUploaded = (newDocument: TenantDocument) => {
    setDocuments((prev) => [newDocument, ...prev]);
    setIsUploadModalOpen(false);
  };

  const handleDocumentDeleted = (documentId: number) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">
            View and manage your lease documents and uploads
          </p>
        </div>
        {profileId && (
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Lease Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lease Documents
          </CardTitle>
          <CardDescription>
            Documents related to your lease agreement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaseDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">No lease documents</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Lease documents will appear here when uploaded by your landlord
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {leaseDocuments.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 rounded-lg border p-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <File className="h-8 w-8 shrink-0 text-blue-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium" title={doc.name}>{doc.name}</p>
                      <p className="text-xs text-muted-foreground">PDF Document</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0" asChild>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open document"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenant Uploaded Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Your Documents
          </CardTitle>
          <CardDescription>
            Documents you&apos;ve uploaded (ID, proof of address, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">No uploaded documents</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Documents you upload will appear here
              </p>
              {profileId && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload your first document
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onDeleted={handleDocumentDeleted}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {profileId && (
        <DocumentUploadModal
          open={isUploadModalOpen}
          onOpenChange={setIsUploadModalOpen}
          profileId={profileId}
          onDocumentUploaded={handleDocumentUploaded}
        />
      )}
    </div>
  );
}
