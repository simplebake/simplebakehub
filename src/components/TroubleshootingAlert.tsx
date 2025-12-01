import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TroubleshootingAlertProps {
  premixName: string;
  stepTitle: string;
  stepContent: string;
  stepNumber: number;
  totalSteps: number;
}

const commonObservations = [
  "Dough is too sticky",
  "Dough is too dry",
  "Dough didn't rise",
  "Dough rose too much",
  "Crust is too dark",
  "Center is undercooked",
  "Texture is dense",
  "Texture is crumbly",
];

export const TroubleshootingAlert = ({
  premixName,
  stepTitle,
  stepContent,
  stepNumber,
  totalSteps,
}: TroubleshootingAlertProps) => {
  const [selectedObservations, setSelectedObservations] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<string>("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("low");
  const [loading, setLoading] = useState(false);
  const [showObservations, setShowObservations] = useState(false);

  const handleObservationToggle = (observation: string) => {
    setSelectedObservations((prev) =>
      prev.includes(observation)
        ? prev.filter((o) => o !== observation)
        : [...prev, observation]
    );
  };

  const analyzeSituation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("predict-issues", {
        body: {
          premixName,
          stepTitle,
          stepContent,
          observations: selectedObservations,
          stepNumber,
          totalSteps,
        },
      });

      if (error) throw error;

      if (data.error) {
        if (data.error === "Rate limit exceeded") {
          toast.error("Too many requests. Please wait a moment and try again.");
        } else if (data.error === "Payment required") {
          toast.error("Service temporarily unavailable. Please try again later.");
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setPrediction(data.prediction);
      setSeverity(data.severity);
    } catch (error: any) {
      console.error("Error analyzing situation:", error);
      toast.error("Failed to analyze baking situation");
    } finally {
      setLoading(false);
    }
  };

  // Auto-analyze on step change with no observations (proactive mode)
  useEffect(() => {
    if (stepNumber > 0) {
      setSelectedObservations([]);
      setPrediction("");
      // Auto-analyze after a short delay to give predictive insights
      const timer = setTimeout(() => {
        analyzeSituation();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [stepNumber]);

  const getSeverityIcon = () => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "medium":
        return <Info className="h-5 w-5 text-warning" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-success" />;
    }
  };

  const getSeverityColor = () => {
    switch (severity) {
      case "high":
        return "border-destructive/50 bg-destructive/10";
      case "medium":
        return "border-warning/50 bg-warning/10";
      default:
        return "border-success/50 bg-success/10";
    }
  };

  return (
    <div className="space-y-4">
      <Alert className={`${getSeverityColor()} transition-colors`}>
        <div className="flex items-start gap-3">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            getSeverityIcon()
          )}
          <div className="flex-1 space-y-2">
            <AlertTitle className="flex items-center justify-between">
              <span>Predictive Troubleshooting</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowObservations(!showObservations)}
                className="h-auto py-1 px-2 text-xs"
              >
                {showObservations ? "Hide" : "Report Issue"}
              </Button>
            </AlertTitle>
            <AlertDescription>
              {loading ? (
                <p className="text-sm">Analyzing your baking progress...</p>
              ) : prediction ? (
                <p className="text-sm whitespace-pre-wrap">{prediction}</p>
              ) : (
                <p className="text-sm">Monitoring your baking progress for potential issues...</p>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>

      {showObservations && (
        <div className="p-4 border rounded-lg bg-card space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">What are you noticing?</h4>
            <div className="grid grid-cols-2 gap-3">
              {commonObservations.map((observation) => (
                <div key={observation} className="flex items-center space-x-2">
                  <Checkbox
                    id={observation}
                    checked={selectedObservations.includes(observation)}
                    onCheckedChange={() => handleObservationToggle(observation)}
                  />
                  <Label
                    htmlFor={observation}
                    className="text-sm cursor-pointer"
                  >
                    {observation}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <Button
            onClick={analyzeSituation}
            disabled={loading || selectedObservations.length === 0}
            className="w-full"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze & Get Help"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
