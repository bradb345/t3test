"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Loader2, Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { useUploadThing } from "~/utils/uploadthing";
import { unitDocumentTypes } from "~/lib/document-constants";
import type { UnitDocumentWithUploader } from "../DashboardClient";
import type { unitDocuments } from "~/server/db/schema";
import { useUser } from "@clerk/nextjs";

type UnitDocument = typeof unitDocuments.$inferSelect;

interface UnitDocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: number;
  onDocumentUploaded: (document: UnitDocumentWithUploader) => void;
}

export function UnitDocumentUploadModal({
  open,
  onOpenChange,
  unitId,
  onDocumentUploaded,
}: UnitDocumentUploadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentType, setDocumentType] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user: clerkUser } = useUser();

  const { startUpload } = useUploadThing("unitDocument");

  const resetForm = () => {
    setDocumentType("");
    setNotes("");
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error("File size must be less than 8MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentType) {
      toast.error("Please select a document type");
      return;
    }
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadResult = await startUpload([selectedFile]);
      if (!uploadResult?.[0]) {
        throw new Error("Failed to upload file");
      }

      const uploadedFile = uploadResult[0];

      const response = await fetch("/api/unit-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId,
          documentType,
          fileName: selectedFile.name,
          fileUrl: uploadedFile.ufsUrl,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save document record");
      }

      const { document: newDoc } = (await response.json()) as { document: UnitDocument };

      // Build the UnitDocumentWithUploader for optimistic UI
      const docWithUploader: UnitDocumentWithUploader = {
        ...newDoc,
        uploader: {
          id: 0,
          auth_id: clerkUser?.id ?? "",
          email: clerkUser?.primaryEmailAddress?.emailAddress ?? "",
          first_name: clerkUser?.firstName ?? "You",
          last_name: clerkUser?.lastName ?? "",
          image_url: clerkUser?.imageUrl ?? null,
          roles: null,
          phone: null,
          preferredContactMethod: null,
          notifications: null,
          stripeCustomerId: null,
          stripeConnectedAccountId: null,
          stripeConnectedAccountStatus: null,
          createdAt: new Date(),
          updatedAt: null,
          admin: false,
        },
      };

      toast.success("Document uploaded successfully");
      onDocumentUploaded(docWithUploader);
      resetForm();
    } catch (error) {
      console.error("Error uploading unit document:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload document"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Unit Document</DialogTitle>
          <DialogDescription>
            Upload a document for your unit (insurance, checklists, etc.)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unitDocType">Document Type</Label>
            <Select
              value={documentType}
              onValueChange={setDocumentType}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {unitDocumentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>File</Label>
            {selectedFile ? (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="hidden"
                  id="unit-document-upload"
                />
                <label
                  htmlFor="unit-document-upload"
                  className="flex cursor-pointer flex-col items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Upload className="h-8 w-8" />
                  <span>Click to select a file</span>
                  <span className="text-xs">PDF, JPG, PNG (max 8MB)</span>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitDocNotes">Notes (optional)</Label>
            <Textarea
              id="unitDocNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this document..."
              disabled={isSubmitting}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
