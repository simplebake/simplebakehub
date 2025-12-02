import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { Brain, Loader2, RefreshCw, Thermometer, Droplets, Mountain } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface AdaptiveRecommendationsProps {
  premixId: string;
  premixName: string;
}

interface Environment {
  temperature?: number;
  humidity?: number;
  season?: string;
  altitude?: number;
}

export const AdaptiveRecommendations = ({ premixId, premixName }: AdaptiveRecommendationsProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string>("");
  const [sessionCount, setSessionCount] = useState(0);
  const [showEnvironment, setShowEnvironment] = useState(false);
  const [environment, setEnvironment] = useState<Environment>({});

  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return "spring";
    if (month >= 5 && month <= 7) return "summer";
    if (month >= 8 && month <= 10) return "autumn";
    return "winter";
  };

  const fetchRecommendations = async (env?: Environment) => {
    if (!user) return;

    setLoading(true);
    try {
      const currentEnv = env || {
        season: getCurrentSeason(),
        ...environment,
      };

      const { data, error } = await supabase.functions.invoke("adaptive-recommendations", {
        body: {
          premixId,
          currentEnvironment: currentEnv,
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

      setRecommendations(data.recommendations);
      setSessionCount(data.sessionCount);
    } catch (error: any) {
      console.error("Error fetching recommendations:", error);
      toast.error("Failed to generate adaptive recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [premixId, user]);

  const parseRecommendations = (text: string) => {
    const sections = {
      water: "",
      proofing: "",
      temperature: "",
      insight: "",
    };

    const lines = text.split("\n");
    let currentSection = "";

    lines.forEach((line) => {
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
        sections[currentSection as keyof typeof sections] += " " + line.trim();
      }
    });

    return sections;
  };

  const sections = recommendations ? parseRecommendations(recommendations) : null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Adaptive Recipe Intelligence</CardTitle>
          </div>
          {sessionCount > 0 && (
            <Badge variant="secondary">
              {sessionCount} {sessionCount === 1 ? "bake" : "bakes"} analyzed
            </Badge>
          )}
        </div>
        <CardDescription>
          Personalized adjustments based on your baking history and current conditions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sections ? (
          <>
            <div className="space-y-3">
              {sections.water && (
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="flex items-start gap-2">
                    <Droplets className="h-4 w-4 text-primary mt-1" />
                    <div>
                      <h4 className="font-medium text-sm mb-1">Water Adjustment</h4>
                      <p className="text-sm text-muted-foreground">{sections.water}</p>
                    </div>
                  </div>
                </div>
              )}

              {sections.proofing && (
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="flex items-start gap-2">
                    <RefreshCw className="h-4 w-4 text-primary mt-1" />
                    <div>
                      <h4 className="font-medium text-sm mb-1">Proofing Time</h4>
                      <p className="text-sm text-muted-foreground">{sections.proofing}</p>
                    </div>
                  </div>
                </div>
              )}

              {sections.temperature && (
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="flex items-start gap-2">
                    <Thermometer className="h-4 w-4 text-primary mt-1" />
                    <div>
                      <h4 className="font-medium text-sm mb-1">Temperature</h4>
                      <p className="text-sm text-muted-foreground">{sections.temperature}</p>
                    </div>
                  </div>
                </div>
              )}

              {sections.insight && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-start gap-2">
                    <Brain className="h-4 w-4 text-primary mt-1" />
                    <div>
                      <h4 className="font-medium text-sm mb-1">Personalized Insight</h4>
                      <p className="text-sm text-foreground">{sections.insight}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEnvironment(!showEnvironment)}
              className="w-full"
            >
              <Mountain className="h-4 w-4 mr-2" />
              {showEnvironment ? "Hide" : "Update"} Environmental Data
            </Button>

            {showEnvironment && (
              <div className="space-y-3 p-4 border rounded-lg bg-card">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="temperature" className="text-xs">Temperature (°C)</Label>
                    <Input
                      id="temperature"
                      type="number"
                      placeholder="20"
                      value={environment.temperature || ""}
                      onChange={(e) =>
                        setEnvironment({ ...environment, temperature: parseFloat(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="humidity" className="text-xs">Humidity (%)</Label>
                    <Input
                      id="humidity"
                      type="number"
                      placeholder="50"
                      value={environment.humidity || ""}
                      onChange={(e) =>
                        setEnvironment({ ...environment, humidity: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="season" className="text-xs">Season</Label>
                    <Select
                      value={environment.season}
                      onValueChange={(value) => setEnvironment({ ...environment, season: value })}
                    >
                      <SelectTrigger id="season">
                        <SelectValue placeholder="Select season" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spring">Spring</SelectItem>
                        <SelectItem value="summer">Summer</SelectItem>
                        <SelectItem value="autumn">Autumn</SelectItem>
                        <SelectItem value="winter">Winter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="altitude" className="text-xs">Altitude (m)</Label>
                    <Input
                      id="altitude"
                      type="number"
                      placeholder="0"
                      value={environment.altitude || ""}
                      onChange={(e) =>
                        setEnvironment({ ...environment, altitude: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={() => fetchRecommendations(environment)}
                  disabled={loading}
                  size="sm"
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate Recommendations
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recommendations available yet. Start by updating your environmental data.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
