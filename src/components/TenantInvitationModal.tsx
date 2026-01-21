"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { toast } from "sonner";
import { Loader2, Send, Upload, X, FileText } from "lucide-react";
import { useUploadThing } from "~/utils/uploadthing";

interface TenantInvitationModalProps {
  unitId: number;
  unitNumber: string;
  open: boolean;
  onClose: () => void;
}

export function TenantInvitationModal({
  unitId,
  unitNumber,
  open,
  onClose,
}: TenantInvitationModalProps) {
  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [isExistingTenant, setIsExistingTenant] = useState(false);
  const [rentDueDay, setRentDueDay] = useState<number>(1);
  const [leaseDocuments, setLeaseDocuments] = useState<string[]>([]);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const { startUpload } = useUploadThing("documents");

  const RENT_DUE_DAY_OPTIONS = [
    { value: 1, label: "1st" },
    { value: 5, label: "5th" },
    { value: 10, label: "10th" },
    { value: 15, label: "15th" },
    { value: 20, label: "20th" },
    { value: 25, label: "25th" },
    { value: 28, label: "28th" },
  ];

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingDocs(true);

    try {
      const uploadedFiles = await startUpload(Array.from(files));
      if (uploadedFiles && uploadedFiles.length > 0) {
        setLeaseDocuments((prev) => [...prev, ...uploadedFiles.map((f) => f.url)]);
        toast.success("Document uploaded");
      }
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast.error("Failed to upload documents");
    } finally {
      setIsUploadingDocs(false);
      // Reset the input so the same file can be uploaded again if needed
      e.target.value = "";
    }
  };

  const removeDocument = (urlToRemove: string) => {
    setLeaseDocuments((prev) => prev.filter((url) => url !== urlToRemove));
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isFormValid = () => {
    return tenantName.trim() !== "" && tenantEmail.trim() !== "" && isValidEmail(tenantEmail);
  };

  const validate = () => {
    const newErrors: { name?: string; email?: string } = {};

    if (!tenantName.trim()) {
      newErrors.name = "Tenant name is required";
    }

    if (!tenantEmail.trim()) {
      newErrors.email = "Tenant email is required";
    } else if (!isValidEmail(tenantEmail)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/units/${unitId}/invite-tenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantName,
          tenantEmail,
          isExistingTenant,
          ...(isExistingTenant && {
            rentDueDay,
            leaseDocuments: leaseDocuments.length > 0 ? leaseDocuments : undefined,
          }),
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error: string };
        throw new Error(errorData.error ?? "Failed to send invitation");
      }

      toast.success(`Invitation sent to ${tenantEmail}!`, {
        description: "The tenant will receive an email with an onboarding link.",
      });

      // Reset form and close modal
      setTenantName("");
      setTenantEmail("");
      setIsExistingTenant(false);
      setRentDueDay(1);
      setLeaseDocuments([]);
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isUploadingDocs) {
      setTenantName("");
      setTenantEmail("");
      setIsExistingTenant(false);
      setRentDueDay(1);
      setLeaseDocuments([]);
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Onboard New Tenant</DialogTitle>
          <DialogDescription>
            Send an invitation to your new tenant for Unit {unitNumber}. They&apos;ll
            receive an email with a link to complete their onboarding.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="tenantName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tenant Full Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="tenantName"
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="John Doe"
              className={errors.name ? "border-red-500" : ""}
              disabled={isLoading}
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="tenantEmail"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tenant Email Address <span className="text-red-500">*</span>
            </label>
            <Input
              id="tenantEmail"
              type="email"
              value={tenantEmail}
              onChange={(e) => setTenantEmail(e.target.value)}
              placeholder="john.doe@example.com"
              className={errors.email ? "border-red-500" : ""}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              The invitation link will be valid for 30 days
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
            <input
              id="isExistingTenant"
              type="checkbox"
              checked={isExistingTenant}
              onChange={(e) => setIsExistingTenant(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              disabled={isLoading || isUploadingDocs}
            />
            <label htmlFor="isExistingTenant" className="text-sm">
              <span className="font-medium text-gray-900">This is an existing tenant</span>
              <p className="mt-0.5 text-gray-500">
                Check this if the tenant is already living in the unit. Some verification
                steps will be simplified since they&apos;re already established.
              </p>
            </label>
          </div>

          {isExistingTenant && (
            <div className="space-y-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
              <div>
                <label
                  htmlFor="rentDueDay"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Rent Due Day
                </label>
                <select
                  id="rentDueDay"
                  value={rentDueDay}
                  onChange={(e) => setRentDueDay(parseInt(e.target.value))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  disabled={isLoading || isUploadingDocs}
                >
                  {RENT_DUE_DAY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} of the month
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  The day of each month when rent is due
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lease Documents
                </label>
                <p className="mb-2 text-sm text-gray-500">
                  Upload the signed lease agreement and any addendums (PDF or images)
                </p>
                <div className="flex items-center gap-2">
                  <label className="flex-1">
                    <Input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleDocumentUpload}
                      disabled={isLoading || isUploadingDocs}
                      className="hidden"
                      id="leaseDocumentUpload"
                    />
                    <div className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-600 hover:border-purple-400 hover:bg-purple-50">
                      {isUploadingDocs ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Choose files
                        </>
                      )}
                    </div>
                  </label>
                </div>
                {leaseDocuments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {leaseDocuments.map((url, index) => (
                      <div
                        key={url}
                        className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <FileText className="h-4 w-4 text-purple-600" />
                          <span className="truncate max-w-[200px]">
                            Document {index + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(url)}
                          className="text-gray-400 hover:text-red-500"
                          disabled={isLoading || isUploadingDocs}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              <strong>📧 What happens next:</strong>
              <br />
              The tenant will receive a detailed email guiding them through the
              onboarding process, including providing personal information,
              employment details, references, and uploading required documents.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading || isUploadingDocs}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploadingDocs || !isFormValid()} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
