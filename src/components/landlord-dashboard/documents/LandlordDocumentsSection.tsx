"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Eye,
  Building2,
  Trash2,
  Loader2,
  Upload,
  X,
  Search,
  Filter,
  Plus,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { DeleteConfirmationDialog } from "~/components/DeleteConfirmationDialog";
import { toast } from "sonner";
import { useUploadThing } from "~/utils/uploadthing";
import { prepareFilesForUpload, formatUploadError } from "~/lib/upload-utils";
import { unitDocumentTypes, unitDocumentTypeLabels } from "~/lib/document-constants";
import type { UnitDocumentWithDetails, PropertyWithUnits } from "~/types/landlord";
import type { UnitDocument } from "~/types/schema";

interface LandlordDocumentsSectionProps {
  documents: UnitDocumentWithDetails[];
  properties: PropertyWithUnits[];
}

export function LandlordDocumentsSection({
  documents: initialDocuments,
  properties,
}: LandlordDocumentsSectionProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Units available for the unit filter (scoped to selected property)
  const filterableUnits = propertyFilter === "all"
    ? properties.flatMap((p) => p.units.map((u) => ({ ...u, propertyName: p.name })))
    : (properties.find((p) => p.id.toString() === propertyFilter)?.units ?? []).map((u) => ({
        ...u,
        propertyName: properties.find((p) => p.id.toString() === propertyFilter)?.name ?? "",
      }));

  const filteredDocuments = documents.filter((doc) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      doc.fileName.toLowerCase().includes(searchLower) ||
      (doc.notes?.toLowerCase().includes(searchLower) ?? false) ||
      doc.uploader.first_name.toLowerCase().includes(searchLower) ||
      doc.uploader.last_name.toLowerCase().includes(searchLower);
    const matchesProperty =
      propertyFilter === "all" || doc.property.id.toString() === propertyFilter;
    const matchesUnit =
      unitFilter === "all" || doc.unit.id.toString() === unitFilter;
    const matchesType = typeFilter === "all" || doc.documentType === typeFilter;
    return matchesSearch && matchesProperty && matchesUnit && matchesType;
  });

  const handlePropertyFilterChange = (value: string) => {
    setPropertyFilter(value);
    setUnitFilter("all"); // Reset unit filter when property changes
  };

  const clearFilters = () => {
    setSearchQuery("");
    setPropertyFilter("all");
    setUnitFilter("all");
    setTypeFilter("all");
  };

  const hasActiveFilters =
    searchQuery !== "" || propertyFilter !== "all" || unitFilter !== "all" || typeFilter !== "all";

  const handleDocumentUploaded = (doc: UnitDocument) => {
    const unit = properties.flatMap((p) => p.units).find((u) => u.id === doc.unitId);
    const property = properties.find((p) => p.units.some((u) => u.id === doc.unitId));
    if (unit && property) {
      // We don't have the uploader details from the POST response, so approximate
      setDocuments((prev) => [
        { ...doc, unit, property, uploader: { first_name: "You", last_name: "" } as UnitDocumentWithDetails["uploader"] },
        ...prev,
      ]);
    }
    setUploadModalOpen(false);
  };

  const handleDocumentDeleted = (docId: number) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  // Group documents by property → unit
  const documentsByPropertyUnit = filteredDocuments.reduce(
    (acc, doc) => {
      const key = `${doc.property.name} - Unit ${doc.unit.unitNumber}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(doc);
      return acc;
    },
    {} as Record<string, UnitDocumentWithDetails[]>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Unit Documents</h3>
          <p className="text-sm text-muted-foreground">
            Upload and manage documents for your units — lease agreements, insurance, inspections, and more
          </p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>

        <Select value={propertyFilter} onValueChange={handlePropertyFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id.toString()}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units</SelectItem>
            {filterableUnits.map((unit) => (
              <SelectItem key={unit.id} value={unit.id.toString()}>
                {propertyFilter === "all"
                  ? `${unit.propertyName} - Unit ${unit.unitNumber}`
                  : `Unit ${unit.unitNumber}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Document Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {unitDocumentTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Document List */}
      {filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No unit documents</p>
          <p className="text-sm text-muted-foreground">
            Upload documents like lease agreements, insurance certificates, and inspection reports
          </p>
          <Button className="mt-4" onClick={() => setUploadModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(documentsByPropertyUnit).map(([groupLabel, groupDocs]) => (
            <Card key={groupLabel}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  {groupLabel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {groupDocs.map((doc) => (
                    <UnitDocumentRow
                      key={doc.id}
                      doc={doc}
                      onDeleted={handleDocumentDeleted}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <UnitDocumentUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        properties={properties}
        onDocumentUploaded={handleDocumentUploaded}
      />
    </div>
  );
}

interface UnitDocumentRowProps {
  doc: UnitDocumentWithDetails;
  onDeleted: (docId: number) => void;
}

function UnitDocumentRow({ doc, onDeleted }: UnitDocumentRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/unit-documents/${doc.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error ?? "Failed to delete document");
      }

      toast.success("Document deleted");
      onDeleted(doc.id);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete document"
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className="py-3 first:pt-0 last:pb-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{doc.fileName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {unitDocumentTypeLabels[doc.documentType] ?? doc.documentType}
                </Badge>
                <span>{formatFileSize(doc.fileSize)}</span>
                <span>|</span>
                <span>{formatDate(doc.uploadedAt)}</span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                Uploaded by {doc.uploader.first_name} {doc.uploader.last_name}
              </p>
              {doc.notes && (
                <p className="mt-1 text-xs text-muted-foreground truncate">
                  {doc.notes}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Document"
        description={`Are you sure you want to delete "${doc.fileName}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </>
  );
}

interface UnitDocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: PropertyWithUnits[];
  onDocumentUploaded: (doc: UnitDocument) => void;
}

function UnitDocumentUploadModal({
  open,
  onOpenChange,
  properties,
  onDocumentUploaded,
}: UnitDocumentUploadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { startUpload } = useUploadThing("unitDocument");

  const selectedProperty = properties.find((p) => p.id.toString() === propertyId);
  const availableUnits = selectedProperty?.units ?? [];

  const resetForm = () => {
    setPropertyId("");
    setUnitId("");
    setDocumentType("");
    setNotes("");
    setSelectedFile(null);
  };

  const handlePropertyChange = (value: string) => {
    setPropertyId(value);
    setUnitId("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!propertyId) {
      toast.error("Please select a property");
      return;
    }
    if (!unitId) {
      toast.error("Please select a unit");
      return;
    }
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
      const prepared = await prepareFilesForUpload([selectedFile], "unitDocument");
      if (prepared.error) {
        toast.error(prepared.error);
        setIsSubmitting(false);
        return;
      }

      const uploadResult = await startUpload(prepared.files);
      if (!uploadResult?.[0]) {
        throw new Error("Failed to upload file");
      }

      const uploadedFile = uploadResult[0];

      const response = await fetch("/api/unit-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: parseInt(unitId),
          documentType,
          fileName: selectedFile.name,
          fileUrl: uploadedFile.ufsUrl,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error ?? "Failed to save document record");
      }

      const { document } = (await response.json()) as { document: UnitDocument };
      toast.success("Document uploaded successfully");
      onDocumentUploaded(document);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error(formatUploadError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); onOpenChange(val); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Unit Document</DialogTitle>
          <DialogDescription>
            Upload a document for a specific unit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Property</Label>
            <Select
              value={propertyId}
              onValueChange={handlePropertyChange}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id.toString()}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Unit</Label>
            <Select
              value={unitId}
              onValueChange={setUnitId}
              disabled={isSubmitting || !propertyId}
            >
              <SelectTrigger>
                <SelectValue placeholder={propertyId ? "Select unit" : "Select a property first"} />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id.toString()}>
                    Unit {unit.unitNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Document Type</Label>
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
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add a description or notes about this document..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
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
