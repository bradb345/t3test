"use client";

import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { toast } from "sonner";
import { MoreVertical, Edit, Copy, UserPlus, Trash2, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "~/components/DeleteConfirmationDialog";
import { ConfirmationDialog } from "~/components/ConfirmationDialog";
import { TenantInvitationModal } from "~/components/TenantInvitationModal";
import { GiveNoticeModal } from "~/components/GiveNoticeModal";

interface UnitCardProps {
  unit: {
    id: number;
    unitNumber: string;
    isAvailable: boolean | null;
    isVisible: boolean | null;
    activeLease?: {
      id: number;
      status: string;
      tenant: {
        first_name: string;
        last_name: string;
      };
      leaseEnd: Date;
    } | null;
    hasPendingMaintenance: boolean;
  };
  propertyId: number;
  propertyName: string;
}

export function UnitCard({ unit, propertyId, propertyName }: UnitCardProps) {
  const [isVisible, setIsVisible] = useState(unit.isVisible ?? false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showGiveNoticeModal, setShowGiveNoticeModal] = useState(false);

  const canGiveNotice = unit.activeLease && unit.activeLease.status === "active";

  const handleVisibilityToggle = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/units/${unit.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isVisible: checked }),
      });

      if (!response.ok) {
        throw new Error("Failed to update visibility");
      }

      setIsVisible(checked);
      toast.success(`Unit is now ${checked ? "visible" : "hidden"} in search`);
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast.error("Failed to update visibility");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/units/${unit.id}/duplicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to duplicate unit");
      }

      const duplicatedUnit = await response.json() as { id: number };
      toast.success("Unit duplicated successfully! Redirecting to edit...");
      
      // Redirect to edit page for the new duplicate
      setTimeout(() => {
        window.location.href = `/my-properties/${propertyId}/units/${duplicatedUnit.id}/edit`;
      }, 1000);
    } catch (error) {
      console.error("Error duplicating unit:", error);
      toast.error("Failed to duplicate unit");
      setIsDuplicating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/units/${unit.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete unit");
      }

      toast.success("Unit deleted successfully");
      
      // Refresh the page to update the unit list
      window.location.reload();
    } catch (error) {
      console.error("Error deleting unit:", error);
      toast.error("Failed to delete unit");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Determine unit status
  const getStatus = () => {
    if (unit.hasPendingMaintenance) {
      return {
        label: "Pending Maintenance",
        color: "bg-orange-500 text-white hover:bg-orange-600",
      };
    }

    if (unit.activeLease) {
      // Check if rent is due (lease ending within 30 days)
      const daysUntilEnd = Math.floor(
        (new Date(unit.activeLease.leaseEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilEnd <= 30 && daysUntilEnd > 0) {
        return {
          label: "Rent Due",
          color: "bg-red-500 text-white hover:bg-red-600",
        };
      }

      return {
        label: "Occupied",
        color: "bg-green-600 text-white hover:bg-green-700",
      };
    }

    return {
      label: "Vacant",
      color: "bg-gray-200 text-gray-700 hover:bg-gray-300",
    };
  };

  const status = getStatus();

  return (
    <>
      <TenantInvitationModal
        unitId={unit.id}
        unitNumber={unit.unitNumber}
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {unit.activeLease && (
        <GiveNoticeModal
          open={showGiveNoticeModal}
          onOpenChange={setShowGiveNoticeModal}
          leaseId={unit.activeLease.id}
          unitNumber={unit.unitNumber}
          propertyName={propertyName}
          tenantName={`${unit.activeLease.tenant.first_name} ${unit.activeLease.tenant.last_name}`}
          onSuccess={() => window.location.reload()}
        />
      )}
      
      <Card className="p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">Unit {unit.unitNumber}</h3>
            <Badge className={`${status.color} border-0 px-3 py-1`}>
              {status.label}
            </Badge>
          </div>
          
          {unit.activeLease ? (
            <p className="text-muted-foreground">
              Tenant: {unit.activeLease.tenant.first_name} {unit.activeLease.tenant.last_name}
            </p>
          ) : (
            <p className="text-muted-foreground">Vacant</p>
          )}
          
          <div className="flex items-center gap-2 mt-3">
            <Switch
              checked={isVisible}
              onCheckedChange={handleVisibilityToggle}
              disabled={isUpdating}
            />
            <label className="text-sm text-muted-foreground">
              {isVisible ? "Visible in search" : "Hidden from search"}
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            className="px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-accent"
            onClick={() => {
              window.open(`/units/${unit.id}`, '_blank', 'noopener,noreferrer');
            }}
          >
            View
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="px-3 py-2 border border-input rounded-md text-sm font-medium hover:bg-accent"
                disabled={isDuplicating || isDeleting}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  window.location.href = `/my-properties/${propertyId}/units/${unit.id}/edit`;
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDuplicateModal(true)}
                disabled={isDuplicating}
              >
                <Copy className="mr-2 h-4 w-4" />
                {isDuplicating ? "Duplicating..." : "Duplicate"}
              </DropdownMenuItem>
              {!unit.activeLease && (
                <DropdownMenuItem
                  onClick={() => setShowInviteModal(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Onboard Tenant
                </DropdownMenuItem>
              )}
              {canGiveNotice && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowGiveNoticeModal(true)}
                    className="text-orange-600 focus:text-orange-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Give 2-Month Notice
                  </DropdownMenuItem>
                </>
              )}
              {!unit.activeLease && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteModal(true)}
                    disabled={isDeleting}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DeleteConfirmationDialog
            open={showDeleteModal}
            onOpenChange={setShowDeleteModal}
            onConfirm={handleDelete}
            title={`Delete Unit ${unit.unitNumber}?`}
            description="This action cannot be undone. This will permanently delete the unit, all associated images, and remove it from search results."
            isDeleting={isDeleting}
          />

          <ConfirmationDialog
            open={showDuplicateModal}
            onOpenChange={setShowDuplicateModal}
            onConfirm={handleDuplicate}
            title={`Duplicate Unit ${unit.unitNumber}?`}
            description="This will create a copy of this unit with the same details. You'll be redirected to edit the new unit after it's created."
            confirmLabel="Duplicate"
            confirmingLabel="Duplicating..."
            isLoading={isDuplicating}
          />
        </div>
      </div>
    </Card>
    </>
  );
}
