import { cn } from "@/lib/utils";

interface ProgressStepperProps {
  current: number;
  total: number;
}

const ProgressStepper = ({ current, total }: ProgressStepperProps) => {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Step {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full bg-primary transition-all duration-300")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressStepper;
