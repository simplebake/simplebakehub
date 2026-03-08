import { cn } from "@/lib/utils";
import { Info, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";

type CalloutVariant = "info" | "warning" | "success" | "tip";

interface InfoCalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const variantConfig: Record<CalloutVariant, { icon: typeof Info; bg: string; border: string; text: string }> = {
  info: { icon: Info, bg: "bg-primary/5", border: "border-primary/20", text: "text-primary" },
  warning: { icon: AlertTriangle, bg: "bg-warning/5", border: "border-warning/20", text: "text-warning" },
  success: { icon: CheckCircle2, bg: "bg-success/5", border: "border-success/20", text: "text-success" },
  tip: { icon: Lightbulb, bg: "bg-accent/5", border: "border-accent/20", text: "text-accent" },
};

export const InfoCallout = ({ variant = "info", title, children, className }: InfoCalloutProps) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={cn("rounded-lg border p-4", config.bg, config.border, className)}>
      <div className="flex gap-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", config.text)} />
        <div className="space-y-1">
          {title && <p className={cn("text-sm font-semibold", config.text)}>{title}</p>}
          <div className="text-sm text-foreground/80">{children}</div>
        </div>
      </div>
    </div>
  );
};
