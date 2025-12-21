import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Flag, AlertTriangle } from "lucide-react";

interface ReportContentDialogProps {
  contentType: "bake_share" | "comment";
  contentId: string;
  trigger?: React.ReactNode;
}

const reasons = [
  { value: "inappropriate", label: "Inappropriate Content", description: "Contains offensive or unsuitable material" },
  { value: "spam", label: "Spam", description: "Promotional or repetitive content" },
  { value: "harassment", label: "Harassment", description: "Bullying or targeted harassment" },
  { value: "misinformation", label: "Misinformation", description: "False or misleading information" },
  { value: "other", label: "Other", description: "Another reason not listed above" },
];

export function ReportContentDialog({ contentType, contentId, trigger }: ReportContentDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to report content");
      return;
    }

    if (!reason) {
      toast.error("Please select a reason for your report");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("content_reports")
        .insert({
          reporter_id: user.id,
          content_type: contentType,
          content_id: contentId,
          reason,
          description: description.trim() || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error("You have already reported this content");
        } else {
          throw error;
        }
        return;
      }

      // Send notification to moderators
      try {
        await supabase.functions.invoke('notify-moderators', {
          body: {
            type: 'community_report',
            data: {
              reportType: contentType === 'bake_share' ? 'Bake Share' : 'Comment',
              contentId: contentId,
              reportedBy: user.email || 'Anonymous',
              reason: reasons.find(r => r.value === reason)?.label || reason,
            }
          }
        });
      } catch (e) {
        console.error('Failed to notify moderators:', e);
      }

      toast.success("Thank you for your report. Our team will review it.");
      setOpen(false);
      setReason("");
      setDescription("");
    } catch (error: any) {
      toast.error("Failed to submit report");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
            <Flag className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Report Content
          </DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting content that violates our guidelines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Why are you reporting this?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {reasons.map((r) => (
                <div key={r.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={r.value} id={r.value} className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor={r.value} className="font-medium cursor-pointer">
                      {r.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{r.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional details (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more context about why you're reporting this..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
