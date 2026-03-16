import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Brain,
  Loader2,
  Droplets,
  RefreshCw,
  Thermometer,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface RecipePersonaliserBannerProps {
  premixId?: string;
  premixName: string;
}

interface ParsedSections {
  water: string;
  proofing: string;
  temperature: string;
  insight: string;
}

const getCurrentSeason = () => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
};

const parseRecommendations = (text: string): ParsedSections => {
  const sections: ParsedSections = { water: "", proofing: "", temperature: "", insight: "" };
  let currentSection = "";

  for (const line of text.split("\n")) {
    const upper = line.toUpperCase();
    if (upper.startsWith("WATER:")) {
      currentSection = "water";
      sections.water = line.substring(line.indexOf(":") + 1).trim();
    } else if (upper.startsWith("PROOFING:")) {
      currentSection = "proofing";
      sections.proofing = line.substring(line.indexOf(":") + 1).trim();
    } else if (upper.startsWith("TEMPERATURE:")) {
      currentSection = "temperature";
      sections.temperature = line.substring(line.indexOf(":") + 1).trim();
    } else if (upper.startsWith("KEY INSIGHT:")) {
      currentSection = "insight";
      sections.insight = line.substring(line.indexOf(":") + 1).trim();
    } else if (currentSection && line.trim()) {
      sections[currentSection as keyof ParsedSections] += " " + line.trim();
    }
  }
  return sections;
};

const ADJUSTMENT_ICONS = [
  { key: "water" as const, icon: Droplets, label: "Water" },
  { key: "proofing" as const, icon: RefreshCw, label: "Proofing" },
  { key: "temperature" as const, icon: Thermometer, label: "Temperature" },
];

export const RecipePersonaliserBanner = ({
  premixId,
  premixName,
}: RecipePersonaliserBannerProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string>("");
  const [sessionCount, setSessionCount] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const fetchRecommendations = async () => {
    if (!user || !premixId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "adaptive-recommendations",
        {
          body: {
            premixId,
            currentEnvironment: { season: getCurrentSeason() },
          },
        }
      );
      if (error) throw error;
      if (data.error) {
        if (data.error === "Rate limit exceeded") {
          toast.error("Too many requests. Please wait a moment.");
        } else if (data.error === "Payment required") {
          toast.error("Service temporarily unavailable.");
        }
        return;
      }
      setRecommendations(data.recommendations);
      setSessionCount(data.sessionCount);
    } catch (err) {
      console.error("Personaliser error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [premixId, user]);

  // Don't render for logged-out users or when there's no premixId
  if (!user || !premixId) return null;

  const sections = recommendations ? parseRecommendations(recommendations) : null;
  const hasAdjustments =
    sections && (sections.water || sections.proofing || sections.temperature);

  return (
    <Card className="overflow-hidden border-primary/30 bg-gradient-to-r from-primary/8 via-accent/6 to-primary/8">
      <CardContent className="p-0">
        {/* Header row — always visible */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-primary/5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                Your Personalised Adjustments
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </h3>
              <p className="text-xs text-muted-foreground">
                {loading
                  ? "Analysing your baking history…"
                  : sessionCount > 0
                  ? `Based on ${sessionCount} previous ${sessionCount === 1 ? "bake" : "bakes"} with ${premixName}`
                  : `General tips for ${premixName} in ${getCurrentSeason()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sessionCount > 0 && !loading && (
              <Badge variant="secondary" className="hidden sm:flex text-xs">
                {sessionCount} {sessionCount === 1 ? "bake" : "bakes"}
              </Badge>
            )}
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Quick-glance chips — always visible when we have data */}
        {!loading && hasAdjustments && !expanded && (
          <div className="flex flex-wrap gap-2 px-5 pb-4">
            {ADJUSTMENT_ICONS.map(
              ({ key, icon: Icon, label }) =>
                sections[key] && (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1 text-xs text-foreground"
                  >
                    <Icon className="h-3 w-3 text-primary" />
                    <span className="font-medium">{label}:</span>{" "}
                    {sections[key].length > 60
                      ? sections[key].slice(0, 57) + "…"
                      : sections[key]}
                  </span>
                )
            )}
          </div>
        )}

        {/* Expanded detail view */}
        {expanded && !loading && sections && (
          <div className="space-y-3 px-5 pb-5">
            {ADJUSTMENT_ICONS.map(
              ({ key, icon: Icon, label }) =>
                sections[key] && (
                  <div
                    key={key}
                    className="flex items-start gap-3 rounded-lg bg-card border border-border p-3"
                  >
                    <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium mb-0.5">{label}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {sections[key]}
                      </p>
                    </div>
                  </div>
                )
            )}

            {sections.insight && (
              <div className="flex items-start gap-3 rounded-lg bg-primary/10 border border-primary/20 p-3">
                <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-medium mb-0.5">
                    Personalised Insight
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">
                    {sections.insight}
                  </p>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fetchRecommendations();
              }}
              disabled={loading}
              className="w-full text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Refresh Recommendations
            </Button>
          </div>
        )}

        {/* Loading state inside expanded */}
        {expanded && loading && (
          <div className="flex items-center justify-center py-8 pb-5">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
