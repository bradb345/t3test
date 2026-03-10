"use client";

import { Check } from "lucide-react";
import { cn } from "~/lib/utils";

export interface FormStep {
  label: string;
  description?: string;
}

interface FormStepIndicatorProps {
  steps: FormStep[];
  currentStep: number;
  onStepClick: (step: number) => void;
  mode: "create" | "edit";
  isStepComplete: (step: number) => boolean;
}

export function FormStepIndicator({
  steps,
  currentStep,
  onStepClick,
  mode,
  isStepComplete,
}: FormStepIndicatorProps) {
  const canNavigateTo = (stepIndex: number) => {
    const stepNumber = stepIndex + 1;
    if (mode === "edit") return true;
    // In create mode, can go back freely, but can only go forward if all prior steps are complete
    if (stepNumber <= currentStep) return true;
    // Check all steps before the target are complete
    for (let i = 1; i < stepNumber; i++) {
      if (!isStepComplete(i)) return false;
    }
    return true;
  };

  return (
    <div className="mb-8">
      {/* Desktop */}
      <div className="hidden sm:flex items-center">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCurrent = stepNumber === currentStep;
          const completed = isStepComplete(stepNumber) && stepNumber !== currentStep;
          const clickable = canNavigateTo(index);

          return (
            <div key={step.label} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => clickable && onStepClick(stepNumber)}
                disabled={!clickable}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all w-full",
                  clickable && !isCurrent && "cursor-pointer hover:bg-muted/50",
                  isCurrent && "bg-primary/10 ring-2 ring-primary/20",
                  !clickable && "cursor-not-allowed opacity-50"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                    completed && "border-green-500 bg-green-500 text-white",
                    isCurrent && !completed && "border-primary bg-primary text-primary-foreground",
                    !isCurrent && !completed && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {completed ? <Check className="h-4 w-4" /> : stepNumber}
                </div>
                <div className="min-w-0">
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isCurrent && "text-primary",
                      completed && "text-green-600",
                      !isCurrent && !completed && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {step.description}
                    </div>
                  )}
                </div>
              </button>

              {index < steps.length - 1 && (
                <div className="mx-2 h-0.5 w-8 shrink-0 rounded-full bg-muted-foreground/20" />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-sm font-medium text-primary">
            {steps[currentStep - 1]?.label}
          </span>
        </div>
        <div className="flex gap-1.5">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCurrent = stepNumber === currentStep;
            const completed = isStepComplete(stepNumber) && stepNumber !== currentStep;
            const clickable = canNavigateTo(index);

            return (
              <button
                key={step.label}
                type="button"
                onClick={() => clickable && onStepClick(stepNumber)}
                disabled={!clickable}
                className={cn(
                  "h-2 flex-1 rounded-full transition-all",
                  completed && "bg-green-500",
                  isCurrent && "bg-primary",
                  !isCurrent && !completed && "bg-muted-foreground/20",
                  clickable && !isCurrent && "cursor-pointer hover:opacity-80",
                  !clickable && "cursor-not-allowed"
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
