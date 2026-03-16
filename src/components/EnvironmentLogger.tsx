import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Thermometer,
  Droplets,
  Mountain,
  CloudSun,
  Check,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";

export interface EnvironmentData {
  temperature?: number;
  humidity?: number;
  altitude?: number;
  season?: string;
  ovenType?: string;
}

interface EnvironmentLoggerProps {
  onChange?: (data: EnvironmentData) => void;
  compact?: boolean;
}

const getCurrentSeason = () => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
};

export const EnvironmentLogger = ({ onChange, compact = false }: EnvironmentLoggerProps) => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState<EnvironmentData>({
    season: getCurrentSeason(),
  });

  // Load saved defaults from user_preferences
  useEffect(() => {
    if (!user) return;
    const loadDefaults = async () => {
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();

      if (prefs?.preferences) {
        const p = prefs.preferences as Record<string, unknown>;
        const env = p.environment as Record<string, unknown> | undefined;
        if (env) {
          const defaults: EnvironmentData = {
            altitude: env.altitude as number | undefined,
            ovenType: env.ovenType as string | undefined,
            season: getCurrentSeason(),
          };
          setData((prev) => ({ ...prev, ...defaults }));
          onChange?.({ ...data, ...defaults });
        }
      }
    };
    loadDefaults();
  }, [user]);

  const update = (partial: Partial<EnvironmentData>) => {
    const next = { ...data, ...partial };
    setData(next);
    setSaved(false);
    onChange?.(next);
  };

  const saveDefaults = async () => {
    if (!user) return;
    try {
      const envDefaults = {
        altitude: data.altitude,
        ovenType: data.ovenType,
      };

      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id, preferences")
        .eq("user_id", user.id)
        .maybeSingle();

      const currentPrefs = (existing?.preferences as Record<string, unknown>) || {};
      const newPrefs = { ...currentPrefs, environment: envDefaults };

      if (existing) {
        await supabase
          .from("user_preferences")
          .update({ preferences: newPrefs })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("user_preferences")
          .insert({ user_id: user.id, preferences: newPrefs });
      }

      setSaved(true);
      toast.success("Environment defaults saved! They'll pre-fill next time.");
    } catch {
      toast.error("Couldn't save defaults.");
    }
  };

  const filledCount = [data.temperature, data.humidity, data.altitude, data.ovenType].filter(
    Boolean
  ).length;

  if (!user) return null;

  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-0">
        {/* Collapsed header */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-2.5">
            <CloudSun className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Baking Conditions
            </span>
            {filledCount > 0 && !expanded && (
              <span className="text-xs text-muted-foreground">
                ({filledCount} logged)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {filledCount > 0 && (
              <Check className="h-3.5 w-3.5 text-primary" />
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {expanded && (
          <div className="space-y-4 px-4 pb-4">
            <p className="text-xs text-muted-foreground">
              Log your current conditions so the AI can personalise future recommendations.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="env-temp" className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Thermometer className="h-3 w-3" /> Kitchen Temp (°C)
                </Label>
                <Input
                  id="env-temp"
                  type="number"
                  placeholder="e.g. 22"
                  value={data.temperature ?? ""}
                  onChange={(e) =>
                    update({ temperature: e.target.value ? parseFloat(e.target.value) : undefined })
                  }
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="env-humidity" className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Droplets className="h-3 w-3" /> Humidity (%)
                </Label>
                <Input
                  id="env-humidity"
                  type="number"
                  placeholder="e.g. 55"
                  value={data.humidity ?? ""}
                  onChange={(e) =>
                    update({ humidity: e.target.value ? parseInt(e.target.value) : undefined })
                  }
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="env-altitude" className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Mountain className="h-3 w-3" /> Altitude (m)
                </Label>
                <Input
                  id="env-altitude"
                  type="number"
                  placeholder="e.g. 150"
                  value={data.altitude ?? ""}
                  onChange={(e) =>
                    update({ altitude: e.target.value ? parseInt(e.target.value) : undefined })
                  }
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="env-season" className="text-xs flex items-center gap-1.5 mb-1.5">
                  <CloudSun className="h-3 w-3" /> Season
                </Label>
                <Select
                  value={data.season}
                  onValueChange={(v) => update({ season: v })}
                >
                  <SelectTrigger id="env-season" className="h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spring">Spring</SelectItem>
                    <SelectItem value="summer">Summer</SelectItem>
                    <SelectItem value="autumn">Autumn</SelectItem>
                    <SelectItem value="winter">Winter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="env-oven" className="text-xs mb-1.5 block">
                Oven Type
              </Label>
              <Select
                value={data.ovenType}
                onValueChange={(v) => update({ ovenType: v })}
              >
                <SelectTrigger id="env-oven" className="h-9">
                  <SelectValue placeholder="Select oven type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conventional">Conventional</SelectItem>
                  <SelectItem value="convection">Convection/Fan</SelectItem>
                  <SelectItem value="gas">Gas</SelectItem>
                  <SelectItem value="wood-fired">Wood Fired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={saveDefaults}
              className="w-full text-xs"
            >
              {saved ? (
                <>
                  <Check className="h-3 w-3 mr-1.5" /> Defaults Saved
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1.5" /> Save Altitude & Oven as Defaults
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
