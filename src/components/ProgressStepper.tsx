import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  description?: string;
}

interface ProgressStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (index: number) => void;
}

export const ProgressStepper = ({ steps, currentStep, onStepClick }: ProgressStepperProps) => {
  return (
    <div className="w-full">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={index} className="flex flex-1 items-center">
              <button
                onClick={() => onStepClick?.(index)}
                disabled={!onStepClick}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                  isComplete && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary bg-background text-primary",
                  !isComplete && !isCurrent && "border-muted-foreground/30 bg-background text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : index + 1}
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 transition-colors",
                    isComplete ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex">
        {steps.map((step, index) => (
          <div key={index} className="flex-1 pr-2">
            <p
              className={cn(
                "text-xs font-medium",
                index === currentStep ? "text-primary" : "text-muted-foreground"
              )}
            >
              {step.label}
            </p>
            {step.description && (
              <p className="text-[10px] text-muted-foreground">{step.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
