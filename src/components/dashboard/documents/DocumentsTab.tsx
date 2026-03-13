"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Upload, File, ExternalLink, Download, FolderOpen, Trash2, Loader2, FileText } from "lucide-react";
import { DocumentCard } from "./DocumentCard";
import { DocumentUploadModal } from "./DocumentUploadModal";
import { UnitDocumentUploadModal } from "./UnitDocumentUploadModal";
import { DeleteConfirmationDialog } from "~/components/DeleteConfirmationDialog";
import { unitDocumentTypeLabels } from "~/lib/document-constants";
import { formatDate } from "~/lib/date";
import { toast } from "sonner";
import type {
  leases,
  units,
  properties,
  tenantDocuments,
} from "~/server/db/schema";
import type { UnitDocumentWithUploader } from "../DashboardClient";
import { isSafeUploadUrl } from "~/lib/upload-url";

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
  unitDocuments: UnitDocumentWithUploader[];
  profileId: number | null;
  currentUserAuthId: string;
}

export function DocumentsTab({
  lease,
  tenantDocuments: initialDocuments,
  unitDocuments: initialUnitDocuments,
  profileId,
  currentUserAuthId,
}: DocumentsTabProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [unitDocs, setUnitDocs] = useState(initialUnitDocuments);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUnitDocUploadOpen, setIsUnitDocUploadOpen] = useState(false);
  const [defaultDocumentType, setDefaultDocumentType] = useState<string | undefined>();
  const [deletingUnitDocId, setDeletingUnitDocId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [unitDocToDelete, setUnitDocToDelete] = useState<UnitDocumentWithUploader | null>(null);

  const handleDocumentUploaded = (newDocument: TenantDocument) => {
    setDocuments((prev) => [newDocument, ...prev]);
    setIsUploadModalOpen(false);
    setDefaultDocumentType(undefined);
  };

  const handleDocumentDeleted = (documentId: number) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  };

  const handleUnitDocumentUploaded = (newDoc: UnitDocumentWithUploader) => {
    setUnitDocs((prev) => [newDoc, ...prev]);
    setIsUnitDocUploadOpen(false);
  };

  const handleDeleteUnitDoc = async () => {
    if (!unitDocToDelete) return;
    setDeletingUnitDocId(unitDocToDelete.id);
    try {
      const response = await fetch(`/api/unit-documents/${unitDocToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete document");
      }
      toast.success("Document deleted successfully");
      setUnitDocs((prev) => prev.filter((doc) => doc.id !== unitDocToDelete.id));
    } catch (error) {
      console.error("Error deleting unit document:", error);
      toast.error("Failed to delete document");
    } finally {
      setDeletingUnitDocId(null);
      setShowDeleteDialog(false);
      setUnitDocToDelete(null);
    }
  };

  const leaseDocuments = useMemo(() => {
    try {
      if (!lease.lease.documents) return [];
      const docs = JSON.parse(lease.lease.documents) as string[];
      return docs.filter(isSafeUploadUrl);
    } catch {
      return [];
    }
  }, [lease.lease.documents]);

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
          <Button onClick={() => {
            setDefaultDocumentType(undefined);
            setIsUploadModalOpen(true);
          }}>
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
            Signed lease agreements and related documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaseDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">No lease documents</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Lease documents will appear here once they are uploaded by your landlord
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {leaseDocuments.map((url, index) => {
                const fileName = (() => {
                  try {
                    const pathname = new URL(url).pathname;
                    const decoded = decodeURIComponent(pathname.split("/").pop() ?? "");
                    return decoded || `Lease Document ${index + 1}`;
                  } catch {
                    return `Lease Document ${index + 1}`;
                  }
                })();

                return (
                  <div key={url} className="flex flex-col rounded-lg border p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <File className="h-8 w-8 shrink-0 text-blue-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium" title={fileName}>
                          {fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Lease Document
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-3 w-3" />
                          View
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <a href={url} download={fileName}>
                          <Download className="mr-2 h-3 w-3" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unit Documents (shared between landlord and tenant) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Unit Documents
            </CardTitle>
            <CardDescription className="mt-1.5">
              Shared documents for your unit (insurance, inspections, checklists, etc.)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUnitDocUploadOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </CardHeader>
        <CardContent>
          {unitDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">No unit documents</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Documents uploaded to your unit will appear here
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {unitDocs.map((doc) => (
                <div key={doc.id} className="flex flex-col rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <File className="h-8 w-8 shrink-0 text-blue-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium" title={doc.fileName}>
                          {doc.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {unitDocumentTypeLabels[doc.documentType] ?? doc.documentType}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    Uploaded {formatDate(doc.uploadedAt)} by {doc.uploader.first_name} {doc.uploader.last_name}
                  </div>

                  {doc.notes && (
                    <div className="mt-2 rounded bg-muted p-2 text-xs text-muted-foreground">
                      {doc.notes}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-3 w-3" />
                        View
                      </a>
                    </Button>
                    {doc.uploader.auth_id === currentUserAuthId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUnitDocToDelete(doc);
                          setShowDeleteDialog(true);
                        }}
                        disabled={deletingUnitDocId === doc.id}
                      >
                        {deletingUnitDocId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>
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
                  onClick={() => {
                    setDefaultDocumentType(undefined);
                    setIsUploadModalOpen(true);
                  }}
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
          onOpenChange={(open) => {
            setIsUploadModalOpen(open);
            if (!open) setDefaultDocumentType(undefined);
          }}
          profileId={profileId}
          onDocumentUploaded={handleDocumentUploaded}
          defaultDocumentType={defaultDocumentType}
        />
      )}

      <UnitDocumentUploadModal
        open={isUnitDocUploadOpen}
        onOpenChange={setIsUnitDocUploadOpen}
        unitId={lease.unit.id}
        onDocumentUploaded={handleUnitDocumentUploaded}
      />

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteUnitDoc}
        title="Delete Document"
        description={`Are you sure you want to delete "${unitDocToDelete?.fileName}"? This action cannot be undone.`}
        isDeleting={deletingUnitDocId !== null}
      />
    </div>
  );
}
