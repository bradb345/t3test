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
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useUploadThing } from "~/utils/uploadthing";
import type { maintenanceRequests } from "~/server/db/schema";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
} from "~/lib/constants/maintenance";

type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;

interface CreateMaintenanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: number;
  onRequestCreated: (request: MaintenanceRequest) => void;
}

// Use shared constants
const categories = MAINTENANCE_CATEGORIES;
const priorities = MAINTENANCE_PRIORITIES;

export function CreateMaintenanceModal({
  open,
  onOpenChange,
  unitId,
  onRequestCreated,
}: CreateMaintenanceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload } = useUploadThing("imageUploader");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setPriority("");
    setSelectedFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length + selectedFiles.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    if (!category) {
      toast.error("Please select a category");
      return;
    }
    if (!priority) {
      toast.error("Please select a priority");
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrls: string[] = [];

      // Upload images if any
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        const uploadResult = await startUpload(selectedFiles);
        if (uploadResult) {
          imageUrls = uploadResult.map((file) => file.ufsUrl);
        }
        setIsUploading(false);
      }

      // Submit the request
      const response = await fetch("/api/tenant/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create request");
      }

      const newRequest = (await response.json()) as MaintenanceRequest;
      toast.success("Maintenance request submitted successfully");
      onRequestCreated(newRequest);
      resetForm();
    } catch (error) {
      console.error("Error creating maintenance request:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create request"
      );
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Maintenance Request</DialogTitle>
          <DialogDescription>
            Describe the issue you&apos;re experiencing. Our team will review
            and respond as soon as possible.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief description of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority level" />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex flex-col">
                      <span>{p.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please provide details about the issue, including when it started and any relevant information..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Photos (optional)</Label>
            <div className="rounded-lg border border-dashed p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                disabled={isSubmitting || selectedFiles.length >= 5}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="flex cursor-pointer flex-col items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Upload className="h-8 w-8" />
                <span>Click to upload photos</span>
                <span className="text-xs">Maximum 5 images</span>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="relative rounded-md bg-muted px-3 py-1 text-sm"
                  >
                    {file.name}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-2 text-muted-foreground hover:text-foreground"
                      disabled={isSubmitting}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                  {isUploading ? "Uploading..." : "Submitting..."}
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
