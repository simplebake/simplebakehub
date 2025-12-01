import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface BakingPreferencesSectionProps {
  userId: string;
}

export const BakingPreferencesSection = ({ userId }: BakingPreferencesSectionProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [preferences, setPreferences] = useState({
    difficulty_levels: [] as string[],
    dietary_restrictions: [] as string[],
    favorite_types: [] as string[],
  });

  const difficultyOptions = ["Beginner", "Intermediate", "Advanced"];
  const dietaryOptions = ["Gluten-Free", "Vegan", "Dairy-Free", "Nut-Free"];
  const typeOptions = ["Bread", "Pastries", "Cakes", "Cookies", "Pizza"];

  useEffect(() => {
    fetchPreferences();
  }, [userId]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("preferences")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data?.preferences) {
        setPreferences(data.preferences as any);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_preferences")
          .update({ preferences })
          .eq("user_id", userId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_preferences")
          .insert({ user_id: userId, preferences });
        
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Preferences saved successfully",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (category: keyof typeof preferences, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Baking Preferences</CardTitle>
        <CardDescription>
          Tell us about your baking preferences to get personalized recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <Label className="text-base font-semibold">Preferred Difficulty Levels</Label>
          <div className="space-y-3">
            {difficultyOptions.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`difficulty-${option}`}
                  checked={preferences.difficulty_levels.includes(option)}
                  onCheckedChange={() => togglePreference("difficulty_levels", option)}
                />
                <Label
                  htmlFor={`difficulty-${option}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-base font-semibold">Dietary Restrictions</Label>
          <div className="space-y-3">
            {dietaryOptions.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`dietary-${option}`}
                  checked={preferences.dietary_restrictions.includes(option)}
                  onCheckedChange={() => togglePreference("dietary_restrictions", option)}
                />
                <Label
                  htmlFor={`dietary-${option}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-base font-semibold">Favorite Types</Label>
          <div className="space-y-3">
            {typeOptions.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${option}`}
                  checked={preferences.favorite_types.includes(option)}
                  onCheckedChange={() => togglePreference("favorite_types", option)}
                />
                <Label
                  htmlFor={`type-${option}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
