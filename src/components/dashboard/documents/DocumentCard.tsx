"use client";

import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { File, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { tenantDocuments } from "~/server/db/schema";

type TenantDocument = typeof tenantDocuments.$inferSelect;

interface DocumentCardProps {
  document: TenantDocument;
  onDeleted: (documentId: number) => void;
}

const documentTypeLabels: Record<string, string> = {
  government_id: "Government ID",
  proof_of_address: "Proof of Address",
  pay_stub: "Pay Stub",
  bank_statement: "Bank Statement",
  other: "Other",
};

const statusConfig = {
  pending_review: {
    label: "Pending Review",
    variant: "secondary" as const,
  },
  approved: {
    label: "Approved",
    variant: "default" as const,
  },
  rejected: {
    label: "Rejected",
    variant: "destructive" as const,
  },
};

export function DocumentCard({ document, onDeleted }: DocumentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tenant/documents/${document.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      toast.success("Document deleted successfully");
      onDeleted(document.id);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const status =
    statusConfig[document.status as keyof typeof statusConfig] ??
    statusConfig.pending_review;

  return (
    <>
      <div className="flex flex-col rounded-lg border p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <File className="h-8 w-8 shrink-0 text-blue-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium" title={document.fileName}>
                {document.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {documentTypeLabels[document.documentType] ?? document.documentType}
              </p>
            </div>
          </div>
          <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Uploaded {formatDate(document.uploadedAt)}
        </div>

        {document.notes && (
          <div className="mt-2 rounded bg-muted p-2 text-xs text-muted-foreground">
            {document.notes}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a
              href={document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              View
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-destructive" />
            )}
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{document.fileName}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
