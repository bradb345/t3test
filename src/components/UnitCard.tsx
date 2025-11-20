"use client";

import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { toast } from "sonner";
import { MoreVertical, Edit, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface UnitCardProps {
  unit: {
    id: number;
    unitNumber: string;
    isAvailable: boolean | null;
    isVisible: boolean | null;
    activeLease?: {
      tenant: {
        first_name: string;
        last_name: string;
      };
      leaseEnd: Date;
    } | null;
    hasPendingMaintenance: boolean;
  };
  propertyId: number;
}

export function UnitCard({ unit, propertyId }: UnitCardProps) {
  const [isVisible, setIsVisible] = useState(unit.isVisible ?? false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

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
                disabled={isDuplicating}
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
                onClick={handleDuplicate}
                disabled={isDuplicating}
              >
                <Copy className="mr-2 h-4 w-4" />
                {isDuplicating ? "Duplicating..." : "Duplicate"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
