"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Loader2, Save, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { employmentInfo } from "~/server/db/schema";

type EmploymentInfo = typeof employmentInfo.$inferSelect;

interface EmploymentInfoFormProps {
  employment: EmploymentInfo | null;
  profileId: number;
  onUpdate: (employment: EmploymentInfo) => void;
}

const employmentTypes = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "self_employed", label: "Self Employed" },
];

export function EmploymentInfoForm({
  employment,
  profileId,
  onUpdate,
}: EmploymentInfoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employerName, setEmployerName] = useState(employment?.employerName ?? "");
  const [position, setPosition] = useState(employment?.position ?? "");
  const [employmentType, setEmploymentType] = useState(
    employment?.employmentType ?? "full_time"
  );
  const [annualIncome, setAnnualIncome] = useState(
    employment?.annualIncome ?? ""
  );
  const [employerPhone, setEmployerPhone] = useState(
    employment?.employerPhone ?? ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employerName.trim()) {
      toast.error("Employer name is required");
      return;
    }
    if (!position.trim()) {
      toast.error("Position is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tenant/profile/employment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employerName: employerName.trim(),
          position: position.trim(),
          employmentType,
          annualIncome: annualIncome ? parseFloat(String(annualIncome)) : null,
          employerPhone: employerPhone.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update employment info");
      }

      const updatedEmployment = (await response.json()) as EmploymentInfo;
      toast.success("Employment information updated");
      onUpdate(updatedEmployment);
    } catch (error) {
      console.error("Error updating employment:", error);
      toast.error("Failed to update employment information");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!employment) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="font-medium">No employment information</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Employment details from your onboarding will appear here
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="employerName">Employer Name</Label>
          <Input
            id="employerName"
            value={employerName}
            onChange={(e) => setEmployerName(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="employmentType">Employment Type</Label>
          <Select
            value={employmentType}
            onValueChange={setEmploymentType}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {employmentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="annualIncome">Annual Income</Label>
          <Input
            id="annualIncome"
            type="number"
            placeholder="75000"
            value={annualIncome}
            onChange={(e) => setAnnualIncome(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="employerPhone">Employer Phone</Label>
        <Input
          id="employerPhone"
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={employerPhone}
          onChange={(e) => setEmployerPhone(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
