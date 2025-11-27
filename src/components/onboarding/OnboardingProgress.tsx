"use client";

import { Check } from "lucide-react";
import { cn } from "~/lib/utils";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
}

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  currentStep: number;
  completedSteps: string[];
}

export function OnboardingProgress({
  steps,
  currentStep,
  completedSteps,
}: OnboardingProgressProps) {
  return (
    <div className="w-full py-8">
      <div className="mx-auto max-w-4xl">
        {/* Desktop Progress Bar */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = stepNumber === currentStep;
              const isAccessible = stepNumber <= currentStep;

              return (
                <div key={step.id} className="flex flex-1 items-center">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full border-2 font-semibold transition-all",
                        isCompleted &&
                          "border-green-500 bg-green-500 text-white",
                        isCurrent &&
                          !isCompleted &&
                          "border-purple-600 bg-purple-600 text-white ring-4 ring-purple-100",
                        !isCompleted &&
                          !isCurrent &&
                          isAccessible &&
                          "border-gray-300 bg-white text-gray-600",
                        !isAccessible && "border-gray-200 bg-gray-50 text-gray-400"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <span>{stepNumber}</span>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div
                        className={cn(
                          "text-sm font-medium",
                          isCurrent && "text-purple-600",
                          isCompleted && "text-green-600",
                          !isCurrent && !isCompleted && "text-gray-600"
                        )}
                      >
                        {step.title}
                      </div>
                      <div className="mt-1 hidden text-xs text-gray-500 xl:block">
                        {step.description}
                      </div>
                    </div>
                  </div>

                  {/* Connecting Line */}
                  {index < steps.length - 1 && (
                    <div className="mx-4 flex-1">
                      <div
                        className={cn(
                          "h-1 rounded-full transition-all",
                          completedSteps.includes(steps[index + 1]!.id)
                            ? "bg-green-500"
                            : stepNumber < currentStep
                            ? "bg-purple-600"
                            : "bg-gray-200"
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
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600">
                Step {currentStep} of {steps.length}
              </div>
              <div className="mt-1 text-lg font-semibold text-purple-600">
                {steps[currentStep - 1]?.title}
              </div>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full border-2 font-semibold",
                completedSteps.includes(steps[currentStep - 1]?.id ?? "")
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-purple-600 bg-purple-600 text-white"
              )}
            >
              {completedSteps.includes(steps[currentStep - 1]?.id ?? "") ? (
                <Check className="h-6 w-6" />
              ) : (
                <span>{currentStep}</span>
              )}
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-purple-600 transition-all duration-300"
              style={{
                width: `${(completedSteps.length / steps.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
