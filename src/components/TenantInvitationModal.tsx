"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const validate = () => {
    const newErrors: { name?: string; email?: string } = {};

    if (!tenantName.trim()) {
      newErrors.name = "Tenant name is required";
    }

    if (!tenantEmail.trim()) {
      newErrors.email = "Tenant email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) {
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
    if (!isLoading) {
      setTenantName("");
      setTenantEmail("");
      setIsExistingTenant(false);
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
              disabled={isLoading}
            />
            <label htmlFor="isExistingTenant" className="text-sm">
              <span className="font-medium text-gray-900">This is an existing tenant</span>
              <p className="mt-0.5 text-gray-500">
                Check this if the tenant is already living in the unit. Some verification 
                steps will be simplified since they&apos;re already established.
              </p>
            </label>
          </div>

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
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
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
