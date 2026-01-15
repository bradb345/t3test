"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { useUploadThing } from "~/utils/uploadthing";

interface OnboardingData {
  personal?: Record<string, string>;
  employment?: Record<string, string>;
  proofOfAddress?: Record<string, string>;
  emergencyContact?: Record<string, string>;
  photoId?: Record<string, string>;
}

const ONBOARDING_STEPS = [
  { id: "personal", title: "Personal Info", description: "Basic details" },
  { id: "employment", title: "Employment", description: "Income verification" },
  { id: "proofOfAddress", title: "Proof of Address", description: "Upload utility bill" },
  { id: "emergencyContact", title: "Emergency Contact", description: "Emergency contact info" },
  { id: "photoId", title: "Photo ID", description: "Upload ID document" },
  { id: "review", title: "Review & Submit", description: "Final review" },
];

function OnboardingContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const { user, isLoaded: isUserLoaded } = useUser();

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [stepFormData, setStepFormData] = useState<Record<string, string>>({});
  const [allOnboardingData, setAllOnboardingData] = useState<OnboardingData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [completedInfo, setCompletedInfo] = useState<{
    tenantName: string;
    unitNumber: string | null;
    unitId: number | null;
    propertyName: string | null;
    propertyAddress: string | null;
    acceptedAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState<{
    tenantName: string;
    tenantEmail: string;
    unitId: number;
  } | null>(null);

  // UploadThing hooks for different upload types
  const { startUpload: startPhotoIdUpload } = useUploadThing("photoID");
  const { startUpload: startDocumentUpload } = useUploadThing("documents");

  // Check if current step has all required fields filled
  const isCurrentStepValid = (): boolean => {
    switch (currentStep) {
      case 1: {
        const { firstName, lastName, email, phone, dateOfBirth } = stepFormData;
        return !!(firstName && lastName && email && phone && dateOfBirth);
      }
      case 2: {
        const { employerName, employerPhone, employerAddress, employmentType, salary, workPermit } = stepFormData;
        return !!(employerName && employerPhone && employerAddress && employmentType && salary && workPermit);
      }
      case 3:
        return !!stepFormData.proofOfAddressFileName;
      case 4: {
        const { emergencyContactName, emergencyContactRelationship, emergencyContactPhone } = stepFormData;
        return !!(emergencyContactName && emergencyContactRelationship && emergencyContactPhone);
      }
      case 5:
        return !!stepFormData.photoIdFileName;
      case 6:
        return true; // Review step is always valid
      default:
        return false;
    }
  };

  // Load onboarding progress
  useEffect(() => {
    const loadProgress = async () => {
      if (!token) {
        setError("No invitation token provided");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/onboarding?token=${token}`);
        if (!response.ok) {
          const errorData = (await response.json()) as { error: string };
          throw new Error(errorData.error);
        }

        const data = (await response.json()) as {
          alreadyCompleted?: boolean;
          invitation: {
            id: number;
            unitId?: number;
            tenantEmail: string;
            tenantName: string;
            acceptedAt?: string;
          };
          unit?: {
            id: number;
            unitNumber: string;
          } | null;
          property?: {
            id: number;
            name: string;
            address: string;
          } | null;
          progress?: {
            currentStep: number;
            completedSteps: string[];
            data: OnboardingData;
          };
        };

        // Handle already completed onboarding
        if (data.alreadyCompleted) {
          setAlreadyCompleted(true);
          setCompletedInfo({
            tenantName: data.invitation.tenantName,
            unitNumber: data.unit?.unitNumber ?? null,
            unitId: data.unit?.id ?? null,
            propertyName: data.property?.name ?? null,
            propertyAddress: data.property?.address ?? null,
            acceptedAt: data.invitation.acceptedAt ?? new Date().toISOString(),
          });
          setIsLoading(false);
          return;
        }

        if (!data.progress) {
          throw new Error("Onboarding progress not found");
        }

        setInvitationInfo({
          tenantName: data.invitation.tenantName,
          tenantEmail: data.invitation.tenantEmail,
          unitId: data.invitation.unitId!,
        });
        setCurrentStep(data.progress.currentStep);
        setCompletedSteps(data.progress.completedSteps);
        
        // Store all onboarding data
        setAllOnboardingData(data.progress.data);
        
        // Pre-populate fields from user and invitation
        const initialFormData: Record<string, string> = {
          email: data.invitation.tenantEmail,
        };
        
        // Add first and last name from Clerk user if available and not already saved
        const savedPersonalData = data.progress.data.personal;
        if (user?.firstName && !savedPersonalData?.firstName) {
          initialFormData.firstName = user.firstName;
        }
        if (user?.lastName && !savedPersonalData?.lastName) {
          initialFormData.lastName = user.lastName;
        }
        
        // Load saved data for current step if available
        const currentStepId = ONBOARDING_STEPS[data.progress.currentStep - 1]?.id;
        if (currentStepId && data.progress.data[currentStepId as keyof OnboardingData]) {
          const savedStepData = data.progress.data[currentStepId as keyof OnboardingData];
          if (typeof savedStepData === 'object' && !Array.isArray(savedStepData)) {
            Object.assign(initialFormData, savedStepData);
          }
        }
        
        setStepFormData(initialFormData);
        
        // Check if user is authenticated and email matches
        if (isUserLoaded) {
          if (!user) {
            // User not authenticated - redirect to home page with sign-in redirect
            const currentUrl = window.location.href;
            window.location.href = `/?sign-in=true&redirect_url=${encodeURIComponent(currentUrl)}`;
            return;
          }
          
          const userEmail = user.primaryEmailAddress?.emailAddress;
          if (userEmail !== data.invitation.tenantEmail) {
            setError("This invitation was sent to a different email address. Please sign in with the correct account.");
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load onboarding data");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProgress();
  }, [token, isUserLoaded, user]);

  const saveProgress = async (
    stepId: string,
    stepData: Record<string, unknown>,
    moveToNext = false
  ) => {
    if (!token) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/onboarding?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: moveToNext ? currentStep + 1 : currentStep,
          stepData: { [stepId]: stepData },
          completedStep: stepId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save progress");
      }

      const result = (await response.json()) as {
        progress: {
          completedSteps: string[];
          data: OnboardingData;
        };
      };
      setCompletedSteps(result.progress.completedSteps);
      setAllOnboardingData(result.progress.data);

      if (moveToNext && currentStep < ONBOARDING_STEPS.length) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        
        // Load data for the next step
        const nextStepId = ONBOARDING_STEPS[nextStep - 1]?.id;
        const nextStepData = result.progress.data[nextStepId as keyof OnboardingData];
        
        // Preserve email and name fields for all steps
        const baseData: Record<string, string> = {
          email: invitationInfo?.tenantEmail ?? "",
        };
        
        if (user?.firstName) baseData.firstName = user.firstName;
        if (user?.lastName) baseData.lastName = user.lastName;
        
        if (nextStepData && typeof nextStepData === 'object' && !Array.isArray(nextStepData)) {
          setStepFormData({ ...baseData, ...nextStepData });
        } else {
          setStepFormData(baseData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save progress");
    } finally {
      setIsSaving(false);
    }
  };

  const submitOnboarding = async () => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/onboarding?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkUserId: user?.id,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error: string };
        throw new Error(errorData.error ?? "Failed to submit onboarding");
      }

      setIsCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success screen after completion
  if (isCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <Card className="max-w-lg p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Onboarding Complete! 🎉
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Thank you, {invitationInfo?.tenantName}! Your application has been
            submitted successfully. Your landlord has been notified and will
            review your information.
          </p>
          <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>What happens next?</strong>
              <br />
              Your landlord will review your submitted documents and information.
              You&apos;ll receive an email once your application has been processed.
            </p>
          </div>
          <Button
            className="mt-6 w-full"
            onClick={() => window.location.href = "/"}
          >
            Return to Home
          </Button>
        </Card>
      </div>
    );
  }

  // Show already completed screen
  if (alreadyCompleted && completedInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <Card className="max-w-lg p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Already Completed
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Hi {completedInfo.tenantName}! You&apos;ve already completed your onboarding
            {completedInfo.unitNumber && completedInfo.propertyName && (
              <> for Unit {completedInfo.unitNumber} at {completedInfo.propertyName}</>
            )}.
          </p>
          {completedInfo.propertyAddress && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
              {completedInfo.propertyAddress}
            </p>
          )}
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
            Completed on {new Date(completedInfo.acceptedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Your landlord has your application on file. If you have any questions,
              please contact them directly.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            {completedInfo.unitId && (
              <Button
                className="w-full"
                onClick={() => window.location.href = `/units/${completedInfo.unitId}`}
              >
                View Property Details
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = "/"}
            >
              Return to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <Card className="max-w-md p-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Oops! Something went wrong
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentStepData = ONBOARDING_STEPS[currentStep - 1];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Tenant Onboarding
              </h1>
              {invitationInfo && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Welcome, {invitationInfo.tenantName}!
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Step {currentStep} of {ONBOARDING_STEPS.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {completedSteps.length} completed
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Desktop Progress */}
          <div className="hidden md:block">
            <div className="flex items-center justify-between">
              {ONBOARDING_STEPS.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = stepNumber === currentStep;

                return (
                  <div key={step.id} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                          isCompleted && "border-green-500 bg-green-500 text-white",
                          isCurrent && !isCompleted && "border-purple-600 bg-purple-600 text-white",
                          !isCompleted && !isCurrent && "border-gray-300 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        )}
                      >
                        {isCompleted ? <Check className="h-5 w-5" /> : stepNumber}
                      </div>
                      <div className="mt-2 text-center">
                        <div className={cn("text-xs font-medium text-gray-600 dark:text-gray-400", isCurrent && "text-purple-600 dark:text-purple-400")}>
                          {step.title}
                        </div>
                      </div>
                    </div>
                    {index < ONBOARDING_STEPS.length - 1 && (
                      <div className="mx-2 flex-1">
                        <div
                          className={cn(
                            "h-1 rounded-full",
                            isCompleted ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                          )}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Progress */}
          <div className="md:hidden">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-purple-600 transition-all"
                style={{ width: `${(completedSteps.length / ONBOARDING_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {currentStepData?.title}
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {currentStepData?.description}
            </p>
          </div>

          {/* Render step content */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
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
                    type="text"
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
                  value={stepFormData.email ?? invitationInfo?.tenantEmail ?? ""}
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

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>💡 Why we need this:</strong> This information helps your landlord
                  verify your eligibility and ensures a smooth rental process.
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employerName">
                    Employer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="employerName"
                    type="text"
                    placeholder="Company name"
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
                    placeholder="(555) 123-4567"
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
                  type="text"
                  placeholder="123 Business St, City, State, ZIP"
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

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="supervisorName">
                    Manager/Supervisor Name
                  </Label>
                  <Input
                    id="supervisorName"
                    type="text"
                    placeholder="Full name (optional)"
                    value={stepFormData.supervisorName ?? ""}
                    onChange={(e) =>
                      setStepFormData({
                        ...stepFormData,
                        supervisorName: e.target.value,
                      })
                    }
                  />
                </div>

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
                    <option value="">Select employment type</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="self_employed">Self-employed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salary">
                    Monthly Salary <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="salary"
                    type="text"
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

                <div className="space-y-2">
                  <Label htmlFor="workPermit">
                    Are you on a work permit? <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="workPermit"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={stepFormData.workPermit ?? ""}
                    onChange={(e) =>
                      setStepFormData({
                        ...stepFormData,
                        workPermit: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select an option</option>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>💡 Why we need this:</strong> Employment information helps verify
                  your income and ability to pay rent.
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="proofOfAddress">
                  Upload Proof of Address <span className="text-red-500">*</span>
                </Label>
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
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
                          const uploadedFiles = await startDocumentUpload([file]);
                          if (uploadedFiles?.[0]) {
                            setStepFormData({
                              ...stepFormData,
                              proofOfAddressFileName: file.name,
                              proofOfAddressUrl: uploadedFiles[0].url,
                            });
                          }
                        } catch (err) {
                          console.error("Error uploading document:", err);
                          setError("Failed to upload document. Please try again.");
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    }}
                  />
                  <label
                    htmlFor="proofOfAddress"
                    className={cn("cursor-pointer", isUploading && "pointer-events-none opacity-50")}
                  >
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
                      ) : (
                        <svg
                          className="h-6 w-6 text-purple-600 dark:text-purple-400"
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
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {isUploading ? "Uploading..." : "Click to upload or drag and drop"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      PNG, JPG up to 4MB, or PDF up to 8MB
                    </p>
                  </label>
                  {stepFormData.proofOfAddressFileName && !isUploading && (
                    <p className="mt-4 text-sm text-green-600 dark:text-green-400">
                      ✓ Uploaded: {stepFormData.proofOfAddressFileName}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>💡 Accepted documents:</strong> Utility bill (electric, gas, water),
                  bank statement, or government correspondence showing your current address.
                </p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">
                    Contact Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="emergencyContactName"
                    type="text"
                    placeholder="Full name"
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
                    type="text"
                    placeholder="e.g., Parent, Spouse, Sibling"
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

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="emergencyContactPhone"
                    type="tel"
                    placeholder="(555) 123-4567"
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
                  <Label htmlFor="emergencyContactEmail">
                    Email (Optional)
                  </Label>
                  <Input
                    id="emergencyContactEmail"
                    type="email"
                    placeholder="email@example.com"
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

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>💡 Why we need this:</strong> In case of an emergency, we need
                  someone to contact on your behalf.
                </p>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="photoId">
                  Upload Photo ID <span className="text-red-500">*</span>
                </Label>
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
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
                          const uploadedFiles = await startPhotoIdUpload([file]);
                          if (uploadedFiles?.[0]) {
                            setStepFormData({
                              ...stepFormData,
                              photoIdFileName: file.name,
                              photoIdUrl: uploadedFiles[0].url,
                            });
                          }
                        } catch (err) {
                          console.error("Error uploading photo ID:", err);
                          setError("Failed to upload photo ID. Please try again.");
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    }}
                  />
                  <label
                    htmlFor="photoId"
                    className={cn("cursor-pointer", isUploading && "pointer-events-none opacity-50")}
                  >
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
                      ) : (
                        <svg
                          className="h-6 w-6 text-purple-600 dark:text-purple-400"
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
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {isUploading ? "Uploading..." : "Click to upload or drag and drop"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      PNG, JPG up to 4MB, or PDF up to 8MB
                    </p>
                  </label>
                  {stepFormData.photoIdFileName && !isUploading && (
                    <p className="mt-4 text-sm text-green-600 dark:text-green-400">
                      ✓ Uploaded: {stepFormData.photoIdFileName}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>💡 Accepted documents:</strong> Driver&apos;s license, passport,
                  or government-issued photo ID.
                </p>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Review Your Information</h3>

                <div className="space-y-6">
                  <div>
                    <h4 className="mb-2 font-medium text-gray-700 dark:text-gray-300">Personal Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-900 dark:text-gray-100">
                      <p><span className="text-gray-500 dark:text-gray-400">Name:</span> {allOnboardingData.personal?.firstName} {allOnboardingData.personal?.lastName}</p>
                      <p><span className="text-gray-500 dark:text-gray-400">Email:</span> {allOnboardingData.personal?.email}</p>
                      <p><span className="text-gray-500 dark:text-gray-400">Phone:</span> {allOnboardingData.personal?.phone}</p>
                      <p><span className="text-gray-500 dark:text-gray-400">Date of Birth:</span> {allOnboardingData.personal?.dateOfBirth}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                    <h4 className="mb-2 font-medium text-gray-700 dark:text-gray-300">Employment Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-900 dark:text-gray-100">
                      <p><span className="text-gray-500 dark:text-gray-400">Employer:</span> {allOnboardingData.employment?.employerName}</p>
                      <p><span className="text-gray-500 dark:text-gray-400">Address:</span> {allOnboardingData.employment?.employerAddress}</p>
                      <p><span className="text-gray-500 dark:text-gray-400">Supervisor:</span> {allOnboardingData.employment?.supervisorName ?? "Not provided"}</p>
                      <p><span className="text-gray-500 dark:text-gray-400">Phone:</span> {allOnboardingData.employment?.employerPhone}</p>
                      <p><span className="text-gray-500 dark:text-gray-400">Type:</span> {allOnboardingData.employment?.employmentType?.replace("_", "-") ?? "Not specified"}</p>
                      <p><span className="text-gray-500 dark:text-gray-400">Salary:</span> {allOnboardingData.employment?.salary}</p>
                      <p><span className="text-gray-500 dark:text-gray-400">Work Permit:</span> {allOnboardingData.employment?.workPermit === "yes" ? "Yes" : "No"}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                    <h4 className="mb-2 font-medium text-gray-700 dark:text-gray-300">Documents</h4>
                    <div className="grid grid-cols-1 gap-2 text-sm text-gray-900 dark:text-gray-100 sm:grid-cols-2">
                      <p className="overflow-hidden"><span className="text-gray-500 dark:text-gray-400">Proof of Address:</span> <span className="block truncate" title={allOnboardingData.proofOfAddress?.proofOfAddressFileName}>{allOnboardingData.proofOfAddress?.proofOfAddressFileName ?? "Not uploaded"}</span></p>
                      <p className="overflow-hidden"><span className="text-gray-500 dark:text-gray-400">Photo ID:</span> <span className="block truncate" title={allOnboardingData.photoId?.photoIdFileName}>{allOnboardingData.photoId?.photoIdFileName ?? "Not uploaded"}</span></p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                    <h4 className="mb-2 font-medium text-gray-700 dark:text-gray-300">Emergency Contact</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-900 dark:text-gray-100">
                      <p><span className="text-gray-500 dark:text-gray-400">Name:</span> {allOnboardingData.emergencyContact?.emergencyContactName}</p>
                      <p><span className="text-gray-500 dark:text-gray-400">Relationship:</span> {allOnboardingData.emergencyContact?.emergencyContactRelationship}</p>
                      <p><span className="text-gray-500 dark:text-gray-400">Phone:</span> {allOnboardingData.emergencyContact?.emergencyContactPhone}</p>
                      <p><span className="text-gray-500 dark:text-gray-400">Email:</span> {allOnboardingData.emergencyContact?.emergencyContactEmail ?? "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <p className="text-sm text-green-800 dark:text-green-300">
                  <strong>✓ Almost done!</strong> Please review all your information above.
                  If everything looks correct, click Submit to complete your application.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex gap-4">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => {
                  const prevStep = currentStep - 1;
                  setCurrentStep(prevStep);
                  
                  // Load data for the previous step
                  const prevStepId = ONBOARDING_STEPS[prevStep - 1]?.id;
                  const prevStepData = allOnboardingData[prevStepId as keyof OnboardingData];
                  
                  // Preserve email and name fields
                  const baseData: Record<string, string> = {
                    email: invitationInfo?.tenantEmail ?? "",
                  };
                  
                  if (user?.firstName) baseData.firstName = user.firstName;
                  if (user?.lastName) baseData.lastName = user.lastName;
                  
                  if (prevStepData && typeof prevStepData === 'object' && !Array.isArray(prevStepData)) {
                    setStepFormData({ ...baseData, ...prevStepData });
                  } else {
                    setStepFormData(baseData);
                  }
                }}
                disabled={isSaving}
                className="flex-1"
              >
                Previous
              </Button>
            )}
            <Button
              onClick={() =>
                void saveProgress(
                  currentStepData?.id ?? "",
                  stepFormData,
                  false
                )
              }
              variant="outline"
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? "Saving..." : "Save Progress"}
            </Button>
            <Button
              onClick={() => {
                // Validate required fields based on current step
                if (currentStep === 1) {
                  const { firstName, lastName, email, phone, dateOfBirth } = stepFormData;
                  if (!firstName || !lastName || !email || !phone || !dateOfBirth) {
                    setError("Please fill in all required fields before continuing");
                    return;
                  }
                } else if (currentStep === 2) {
                  const { employerName, employerPhone, employerAddress, employmentType, salary, workPermit } = stepFormData;
                  if (!employerName || !employerPhone || !employerAddress || !employmentType || !salary || !workPermit) {
                    setError("Please fill in all required fields before continuing");
                    return;
                  }
                } else if (currentStep === 3) {
                  if (!stepFormData.proofOfAddressFileName) {
                    setError("Please upload a proof of address document");
                    return;
                  }
                } else if (currentStep === 4) {
                  const { emergencyContactName, emergencyContactRelationship, emergencyContactPhone } = stepFormData;
                  if (!emergencyContactName || !emergencyContactRelationship || !emergencyContactPhone) {
                    setError("Please fill in all required fields before continuing");
                    return;
                  }
                } else if (currentStep === 5) {
                  if (!stepFormData.photoIdFileName) {
                    setError("Please upload a photo ID document");
                    return;
                  }
                }
                setError(null); // Clear any previous errors
                
                // If on the last step (review), submit the onboarding
                if (currentStep === ONBOARDING_STEPS.length) {
                  void submitOnboarding();
                } else {
                  void saveProgress(
                    currentStepData?.id ?? "",
                    stepFormData,
                    true
                  );
                }
              }}
              disabled={isSaving || isSubmitting || !isCurrentStepValid()}
              className="flex-1"
            >
              {isSaving || isSubmitting
                ? (isSubmitting ? "Submitting..." : "Saving...")
                : currentStep === ONBOARDING_STEPS.length
                ? "Submit Application"
                : "Continue"}
            </Button>
          </div>
        </Card>

        {/* Help Section */}
        <div className="mt-6 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Need Help?</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            If you have questions or need assistance completing your onboarding,
            feel free to contact your landlord or our support team.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-600" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your onboarding...</p>
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
