"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { useUploadThing } from "~/utils/uploadthing";
import { Loader2 } from "lucide-react";
import { MultiSelect } from "~/components/ui/multi-select";
import { toast } from "sonner";
import { getCurrencySymbol } from "~/lib/currency";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";

const FEATURE_OPTIONS = [
  "Hardwood Floors",
  "Renovated Kitchen",
  "Balcony",
  "Ocean View",
  "City View",
  "Walk-in Closet",
  "In-unit Laundry",
  "Dishwasher",
  "Air Conditioning",
  "Fireplace",
  "Pet Friendly",
  "High Ceilings",
];

type InitialData = {
  id: number;
  unitNumber: string;
  description: string;
  floorPlan: string;
  squareFeet: number | null;
  numBedrooms: number;
  numBathrooms: string;
  monthlyRent: string;
  deposit: string | null;
  isAvailable: boolean | null;
  isVisible: boolean | null;
  availableFrom: Date | null;
  features: string;
  imageUrls: string;
};

interface UnitListingFormProps {
  propertyId: number;
  currency?: string;
  initialData?: InitialData;
  mode?: "create" | "edit";
}

interface FormData {
  unitNumber: string;
  description: string;
  floorPlan: string[];
  squareFeet: string | number;
  numBedrooms: string | number;
  numBathrooms: string | number;
  monthlyRent: string | number;
  deposit: string | number;
  isAvailable: boolean;
  isVisible: boolean;
  availableFrom: string;
  features: string[];
  imageUrls: string[];
}

export function UnitListingForm({
  propertyId,
  currency = "USD",
  initialData,
  mode = "create",
}: UnitListingFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const currencySymbol = getCurrencySymbol(currency);

  const parseJsonField = (field: string | undefined): string[] => {
    if (!field) return [];
    try {
      const parsed = JSON.parse(field) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  };

  const [formData, setFormData] = useState<FormData>({
    unitNumber: initialData?.unitNumber ?? "",
    description: initialData?.description ?? "",
    floorPlan: initialData ? parseJsonField(initialData.floorPlan) : [],
    squareFeet: initialData?.squareFeet ?? "",
    numBedrooms: initialData?.numBedrooms ?? "",
    numBathrooms: initialData?.numBathrooms ?? "",
    monthlyRent: initialData?.monthlyRent ?? "",
    deposit: initialData?.deposit ?? "",
    isAvailable: initialData?.isAvailable ?? true,
    isVisible: initialData?.isVisible ?? false,
    availableFrom: (initialData?.availableFrom 
      ? new Date(initialData.availableFrom).toISOString().split('T')[0] 
      : "") ?? "",
    features: initialData ? parseJsonField(initialData.features) : [],
    imageUrls: initialData ? parseJsonField(initialData.imageUrls) : [],
  });

  const { startUpload } = useUploadThing("imageUploader");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedImages = await startUpload(Array.from(files));
      if (!uploadedImages) return;

      setFormData((prev) => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...uploadedImages.map((img) => img.url)],
      }));
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFloorPlanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedImages = await startUpload(Array.from(files));
      if (!uploadedImages) return;

      setFormData((prev) => ({
        ...prev,
        floorPlan: [...prev.floorPlan, ...uploadedImages.map((img) => img.url)],
      }));
    } catch (error) {
      console.error("Error uploading floor plans:", error);
      toast.error("Failed to upload floor plans");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const endpoint =
        mode === "create"
          ? `/api/properties/${propertyId}/units`
          : `/api/properties/${propertyId}/units/${initialData?.id}`;

      const method = mode === "create" ? "POST" : "PATCH";

      // Prepare the data for submission
      const submitData = {
        ...formData,
        // Convert arrays to strings for storage
        features: JSON.stringify(formData.features),
        imageUrls: JSON.stringify(formData.imageUrls),
        floorPlan: JSON.stringify(formData.floorPlan),
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to save unit: ${errorData}`);
      }

      toast.success(
        mode === "create"
          ? "Unit created successfully"
          : "Unit updated successfully",
      );
      router.push(`/my-properties/${propertyId}`);
      router.refresh();
    } catch (error) {
      console.error("Error saving unit:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save unit",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardChanges = () => {
    router.push(`/my-properties/${propertyId}`);
  };

  const isStepOneComplete = () => {
    return (
      formData.unitNumber.trim() !== "" &&
      formData.numBedrooms !== "" &&
      formData.numBathrooms !== "" &&
      formData.monthlyRent !== ""
    );
  };

  return (
    <div className="relative">
      {/* Discard Changes Button */}
      <div className="absolute top-0 right-0 z-10">
        <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isSubmitting || isUploading}
            >
              Discard Changes
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to discard all changes? This action cannot be undone and you will lose all unsaved data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDiscardChanges}>
                Yes, Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {currentStep === 1 && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Unit Number <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={formData.unitNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, unitNumber: e.target.value }))
                  }
                  placeholder="e.g., 4B or 101"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Bedrooms <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    min="0"
                    value={formData.numBedrooms}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        numBedrooms: e.target.value ? parseInt(e.target.value) : "",
                      }))
                    }
                    placeholder="e.g., 2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Bathrooms <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.numBathrooms}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        numBathrooms: e.target.value,
                      }))
                    }
                    placeholder="e.g., 1.5"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Square Feet
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.squareFeet}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      squareFeet: e.target.value ? parseInt(e.target.value) : "",
                    }))
                  }
                  placeholder="e.g., 850"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Monthly Rent ({currencySymbol}) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monthlyRent}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        monthlyRent: e.target.value,
                      }))
                    }
                    placeholder="e.g., 2500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Security Deposit ({currencySymbol})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.deposit}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        deposit: e.target.value,
                      }))
                    }
                    placeholder="e.g., 5000"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Available From
                </label>
                <Input
                  type="date"
                  value={formData.availableFrom}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      availableFrom: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isAvailable: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="isAvailable" className="text-sm font-medium">
                  Unit is currently available for rent
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Features
                </label>
                <MultiSelect
                  options={FEATURE_OPTIONS}
                  selected={formData.features}
                  onChange={(selected) => {
                    setFormData((prev) => ({
                      ...prev,
                      features: selected,
                    }));
                  }}
                  placeholder="Select features..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={!isStepOneComplete()}
              >
                Next
              </Button>
            </div>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Photos & Details</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  placeholder="Describe this unit..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Unit Photos</label>
                <p className="mb-2 text-sm text-muted-foreground">
                  Upload photos of the living areas, bedrooms, kitchen, bathrooms, etc.
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="w-full"
                  disabled={isUploading}
                />
                {isUploading && (
                  <div className="mt-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Uploading images...
                    </p>
                  </div>
                )}
                {formData.imageUrls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.imageUrls.map((url, index) => (
                      <div key={url} className="group relative">
                        <Image
                          src={url}
                          alt={`Upload ${index + 1}`}
                          width={80}
                          height={80}
                          className="rounded-md object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              imageUrls: prev.imageUrls.filter((u) => u !== url),
                            }));
                          }}
                          className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Floor Plan Images</label>
                <p className="mb-2 text-sm text-muted-foreground">
                  Upload floor plan images for this unit.
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFloorPlanUpload}
                  className="w-full"
                  disabled={isUploading}
                />
                {formData.floorPlan.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.floorPlan.map((url, index) => (
                      <div key={url} className="group relative">
                        <Image
                          src={url}
                          alt={`Floor plan ${index + 1}`}
                          width={80}
                          height={80}
                          className="rounded-md object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              floorPlan: prev.floorPlan.filter((u) => u !== url),
                            }));
                          }}
                          className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  disabled={isSubmitting || isUploading}
                >
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting || isUploading}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === "create" ? "Creating..." : "Updating..."}
                    </>
                  ) : mode === "create" ? (
                    "Create Unit"
                  ) : (
                    "Update Unit"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </form>
    </div>
  );
}
