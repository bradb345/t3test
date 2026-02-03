"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Loader2, Check, CheckCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import { useUploadThing } from "~/utils/uploadthing";
import { PaymentSetupStep } from "./PaymentSetupStep";

interface TenancyApplicationModalProps {
  open: boolean;
  onClose: () => void;
  unitId: number;
  unitNumber: string;
  propertyName: string;
  monthlyRent: string;
  currency: string;
  defaultName?: string | null;
  defaultEmail?: string | null;
}

interface ApplicationData {
  personal?: Record<string, string>;
  employment?: Record<string, string>;
  proofOfAddress?: Record<string, string>;
  emergencyContact?: Record<string, string>;
  photoId?: Record<string, string>;
  payment?: Record<string, string>;
}

const APPLICATION_STEPS = [
  { id: "personal", title: "Personal Info" },
  { id: "employment", title: "Employment" },
  { id: "proofOfAddress", title: "Proof of Address" },
  { id: "emergencyContact", title: "Emergency Contact" },
  { id: "photoId", title: "Photo ID" },
  { id: "payment", title: "Payment Setup" },
  { id: "review", title: "Review & Submit" },
];

const STORAGE_KEY_PREFIX = "tenancy_application_";

export function TenancyApplicationModal({
  open,
  onClose,
  unitId,
  unitNumber,
  propertyName,
  monthlyRent,
  currency,
  defaultName,
  defaultEmail,
}: TenancyApplicationModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [stepFormData, setStepFormData] = useState<Record<string, string>>({});
  const [allApplicationData, setAllApplicationData] = useState<ApplicationData>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload: startPhotoIdUpload } = useUploadThing("photoID");
  const { startUpload: startDocumentUpload } = useUploadThing("documents");

  const storageKey = `${STORAGE_KEY_PREFIX}${unitId}`;

  // Load saved progress from localStorage
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as {
            currentStep: number;
            completedSteps: string[];
            data: ApplicationData;
          };
          setCurrentStep(parsed.currentStep);
          setCompletedSteps(parsed.completedSteps);
          setAllApplicationData(parsed.data);

          // Load current step data
          const currentStepId = APPLICATION_STEPS[parsed.currentStep - 1]?.id;
          if (
            currentStepId &&
            parsed.data[currentStepId as keyof ApplicationData]
          ) {
            setStepFormData(
              parsed.data[currentStepId as keyof ApplicationData] ?? {}
            );
          } else {
            // Pre-fill with default values
            setStepFormData({
              firstName: defaultName?.split(" ")[0] ?? "",
              lastName: defaultName?.split(" ").slice(1).join(" ") ?? "",
              email: defaultEmail ?? "",
            });
          }
        } catch {
          // Invalid saved data, start fresh
          setStepFormData({
            firstName: defaultName?.split(" ")[0] ?? "",
            lastName: defaultName?.split(" ").slice(1).join(" ") ?? "",
            email: defaultEmail ?? "",
          });
        }
      } else {
        // No saved data, start with defaults
        setStepFormData({
          firstName: defaultName?.split(" ")[0] ?? "",
          lastName: defaultName?.split(" ").slice(1).join(" ") ?? "",
          email: defaultEmail ?? "",
        });
      }
    }
  }, [open, storageKey, defaultName, defaultEmail]);

  // Save progress to localStorage
  const saveProgress = (
    stepId: string,
    stepData: Record<string, string>,
    nextStep: number
  ) => {
    const newData = {
      ...allApplicationData,
      [stepId]: stepData,
    };
    const newCompletedSteps = completedSteps.includes(stepId)
      ? completedSteps
      : [...completedSteps, stepId];

    setAllApplicationData(newData);
    setCompletedSteps(newCompletedSteps);

    const toSave = {
      currentStep: nextStep,
      completedSteps: newCompletedSteps,
      data: newData,
    };
    localStorage.setItem(storageKey, JSON.stringify(toSave));
  };

  const isCurrentStepValid = (): boolean => {
    switch (currentStep) {
      case 1: {
        const { firstName, lastName, email, phone, dateOfBirth } = stepFormData;
        return !!(firstName && lastName && email && phone && dateOfBirth);
      }
      case 2: {
        const {
          employerName,
          employerPhone,
          employerAddress,
          employmentType,
          salary,
        } = stepFormData;
        return !!(
          employerName &&
          employerPhone &&
          employerAddress &&
          employmentType &&
          salary
        );
      }
      case 3:
        return !!stepFormData.proofOfAddressFileName;
      case 4: {
        const {
          emergencyContactName,
          emergencyContactRelationship,
          emergencyContactPhone,
        } = stepFormData;
        return !!(
          emergencyContactName &&
          emergencyContactRelationship &&
          emergencyContactPhone
        );
      }
      case 5:
        return !!stepFormData.photoIdFileName;
      case 6:
        return true; // Payment step always valid (coming soon)
      case 7:
        return true; // Review step always valid
      default:
        return false;
    }
  };

  const handleNext = () => {
    const currentStepData = APPLICATION_STEPS[currentStep - 1];
    if (!currentStepData) return;

    setError(null);
    saveProgress(currentStepData.id, stepFormData, currentStep + 1);
    setCurrentStep(currentStep + 1);

    // Load next step data if available
    const nextStepId = APPLICATION_STEPS[currentStep]?.id;
    if (nextStepId && allApplicationData[nextStepId as keyof ApplicationData]) {
      setStepFormData(
        allApplicationData[nextStepId as keyof ApplicationData] ?? {}
      );
    } else if (nextStepId !== "review" && nextStepId !== "payment") {
      setStepFormData({});
    }
  };

  const handlePrevious = () => {
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);

    // Load previous step data
    const prevStepId = APPLICATION_STEPS[prevStep - 1]?.id;
    if (
      prevStepId &&
      allApplicationData[prevStepId as keyof ApplicationData]
    ) {
      setStepFormData(
        allApplicationData[prevStepId as keyof ApplicationData] ?? {}
      );
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/units/${unitId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationData: allApplicationData,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error || "Failed to submit application");
      }

      // Clear saved progress on success
      localStorage.removeItem(storageKey);
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      if (isSuccess) {
        // Reset all state on successful close
        setCurrentStep(1);
        setCompletedSteps([]);
        setStepFormData({});
        setAllApplicationData({});
        setIsSuccess(false);
      }
      setError(null);
      onClose();
    }
  };

  const currentStepData = APPLICATION_STEPS[currentStep - 1];

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="mb-2 text-xl">
              Application Submitted!
            </DialogTitle>
            <DialogDescription className="mb-6">
              Your application for Unit {unitNumber} at {propertyName} has been
              submitted successfully. The landlord will review your application
              and contact you soon.
            </DialogDescription>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply for Tenancy</DialogTitle>
          <DialogDescription>
            Unit {unitNumber} at {propertyName}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex min-w-max items-center justify-between">
            {APPLICATION_STEPS.map((step, index) => {
              const stepNumber = index + 1;
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = stepNumber === currentStep;

              return (
                <div key={step.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all",
                        isCompleted &&
                          "border-green-500 bg-green-500 text-white",
                        isCurrent &&
                          !isCompleted &&
                          "border-primary bg-primary text-white",
                        !isCompleted &&
                          !isCurrent &&
                          "border-gray-300 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
                    </div>
                    <div className="mt-1 text-center">
                      <div
                        className={cn(
                          "whitespace-nowrap text-[10px] font-medium text-gray-600 dark:text-gray-400",
                          isCurrent && "text-primary dark:text-primary"
                        )}
                      >
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < APPLICATION_STEPS.length - 1 && (
                    <div className="mx-1 flex-1">
                      <div
                        className={cn(
                          "h-0.5 rounded-full",
                          isCompleted
                            ? "bg-green-500"
                            : "bg-gray-200 dark:bg-gray-700"
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-2">
          <h3 className="text-lg font-semibold">{currentStepData?.title}</h3>
        </div>

        {/* Step Content */}
        <div className="space-y-4">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={stepFormData.firstName ?? ""}
                    onChange={(e) =>
                      setStepFormData({
                        ...stepFormData,
                        firstName: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={stepFormData.lastName ?? ""}
                    onChange={(e) =>
                      setStepFormData({
                        ...stepFormData,
                        lastName: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={stepFormData.email ?? ""}
                  onChange={(e) =>
                    setStepFormData({ ...stepFormData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={stepFormData.phone ?? ""}
                  onChange={(e) =>
                    setStepFormData({ ...stepFormData, phone: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={stepFormData.dateOfBirth ?? ""}
                  onChange={(e) =>
                    setStepFormData({
                      ...stepFormData,
                      dateOfBirth: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employerName">
                    Employer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="employerName"
                    value={stepFormData.employerName ?? ""}
                    onChange={(e) =>
                      setStepFormData({
                        ...stepFormData,
                        employerName: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employerPhone">
                    Employer Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="employerPhone"
                    type="tel"
                    value={stepFormData.employerPhone ?? ""}
                    onChange={(e) =>
                      setStepFormData({
                        ...stepFormData,
                        employerPhone: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employerAddress">
                  Employer Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="employerAddress"
                  value={stepFormData.employerAddress ?? ""}
                  onChange={(e) =>
                    setStepFormData({
                      ...stepFormData,
                      employerAddress: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employmentType">
                    Employment Type <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="employmentType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={stepFormData.employmentType ?? ""}
                    onChange={(e) =>
                      setStepFormData({
                        ...stepFormData,
                        employmentType: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select type</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="self_employed">Self-employed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">
                    Monthly Salary <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="salary"
                    placeholder="$0.00"
                    value={stepFormData.salary ?? ""}
                    onChange={(e) =>
                      setStepFormData({
                        ...stepFormData,
                        salary: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Upload Proof of Address <span className="text-red-500">*</span>
                </Label>
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
                  <input
                    id="proofOfAddress"
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    disabled={isUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsUploading(true);
                        setError(null);
                        try {
                          const uploadedFiles = await startDocumentUpload([
                            file,
                          ]);
                          if (uploadedFiles?.[0]) {
                            setStepFormData({
                              ...stepFormData,
                              proofOfAddressFileName: file.name,
                              proofOfAddressUrl: uploadedFiles[0].url,
                            });
                          }
                        } catch (err) {
                          console.error("Error uploading:", err);
                          setError("Failed to upload. Please try again.");
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    }}
                  />
                  <label
                    htmlFor="proofOfAddress"
                    className={cn(
                      "cursor-pointer",
                      isUploading && "pointer-events-none opacity-50"
                    )}
                  >
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <svg
                          className="h-5 w-5 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm font-medium">
                      {isUploading ? "Uploading..." : "Click to upload"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PNG, JPG up to 4MB, or PDF up to 8MB
                    </p>
                  </label>
                  {stepFormData.proofOfAddressFileName && !isUploading && (
                    <p className="mt-3 text-sm text-green-600 dark:text-green-400">
                      Uploaded: {stepFormData.proofOfAddressFileName}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Accepted: Utility bill, bank statement, or government
                  correspondence
                </p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">
                    Contact Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="emergencyContactName"
                    value={stepFormData.emergencyContactName ?? ""}
                    onChange={(e) =>
                      setStepFormData({
                        ...stepFormData,
                        emergencyContactName: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactRelationship">
                    Relationship <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="emergencyContactRelationship"
                    placeholder="e.g., Parent, Spouse"
                    value={stepFormData.emergencyContactRelationship ?? ""}
                    onChange={(e) =>
                      setStepFormData({
                        ...stepFormData,
                        emergencyContactRelationship: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="emergencyContactPhone"
                    type="tel"
                    value={stepFormData.emergencyContactPhone ?? ""}
                    onChange={(e) =>
                      setStepFormData({
                        ...stepFormData,
                        emergencyContactPhone: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactEmail">Email</Label>
                  <Input
                    id="emergencyContactEmail"
                    type="email"
                    value={stepFormData.emergencyContactEmail ?? ""}
                    onChange={(e) =>
                      setStepFormData({
                        ...stepFormData,
                        emergencyContactEmail: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Upload Photo ID <span className="text-red-500">*</span>
                </Label>
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
                  <input
                    id="photoId"
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    disabled={isUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsUploading(true);
                        setError(null);
                        try {
                          const uploadedFiles = await startPhotoIdUpload([
                            file,
                          ]);
                          if (uploadedFiles?.[0]) {
                            setStepFormData({
                              ...stepFormData,
                              photoIdFileName: file.name,
                              photoIdUrl: uploadedFiles[0].url,
                            });
                          }
                        } catch (err) {
                          console.error("Error uploading:", err);
                          setError("Failed to upload. Please try again.");
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    }}
                  />
                  <label
                    htmlFor="photoId"
                    className={cn(
                      "cursor-pointer",
                      isUploading && "pointer-events-none opacity-50"
                    )}
                  >
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <svg
                          className="h-5 w-5 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                          />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm font-medium">
                      {isUploading ? "Uploading..." : "Click to upload"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PNG, JPG up to 4MB, or PDF up to 8MB
                    </p>
                  </label>
                  {stepFormData.photoIdFileName && !isUploading && (
                    <p className="mt-3 text-sm text-green-600 dark:text-green-400">
                      Uploaded: {stepFormData.photoIdFileName}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Accepted: Driver&apos;s license, passport, or government ID
                </p>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <PaymentSetupStep monthlyRent={monthlyRent} currency={currency} />
          )}

          {currentStep === 7 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <h4 className="mb-3 font-medium">Personal Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {allApplicationData.personal?.firstName}{" "}
                    {allApplicationData.personal?.lastName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {allApplicationData.personal?.email}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    {allApplicationData.personal?.phone}
                  </p>
                  <p>
                    <span className="text-muted-foreground">DOB:</span>{" "}
                    {allApplicationData.personal?.dateOfBirth}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <h4 className="mb-3 font-medium">Employment</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Employer:</span>{" "}
                    {allApplicationData.employment?.employerName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    {allApplicationData.employment?.employmentType?.replace(
                      "_",
                      "-"
                    )}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Salary:</span>{" "}
                    {allApplicationData.employment?.salary}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <h4 className="mb-3 font-medium">Documents</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">
                      Proof of Address:
                    </span>{" "}
                    {allApplicationData.proofOfAddress?.proofOfAddressFileName ??
                      "Not uploaded"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Photo ID:</span>{" "}
                    {allApplicationData.photoId?.photoIdFileName ??
                      "Not uploaded"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <h4 className="mb-3 font-medium">Emergency Contact</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {allApplicationData.emergencyContact?.emergencyContactName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Relationship:</span>{" "}
                    {
                      allApplicationData.emergencyContact
                        ?.emergencyContactRelationship
                    }
                  </p>
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    {allApplicationData.emergencyContact?.emergencyContactPhone}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <p className="text-sm text-green-800 dark:text-green-300">
                  Please review all information above. Click Submit to send your
                  application to the landlord.
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="flex-1"
            >
              Previous
            </Button>
          )}
          {currentStep < APPLICATION_STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={!isCurrentStepValid() || isUploading}
              className="flex-1"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
