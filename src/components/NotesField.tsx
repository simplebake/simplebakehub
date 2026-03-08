import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StickyNote } from "lucide-react";

interface NotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  maxLength?: number;
}

export const NotesField = ({
  value,
  onChange,
  label = "Notes",
  placeholder = "Add your observations, adjustments, or reminders…",
  maxLength = 1000,
}: NotesFieldProps) => {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <StickyNote className="h-4 w-4 text-muted-foreground" />
        {label}
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="min-h-[100px] resize-y"
      />
      {maxLength && (
        <p className="text-xs text-muted-foreground text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
};
