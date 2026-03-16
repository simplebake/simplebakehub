import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import type { EnvironmentData } from "@/components/EnvironmentLogger";

interface BakeOutcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  premixId: string;
  sessionId?: string;
  prefillEnvironment?: EnvironmentData;
}

const commonIssues = [
  "Too dense",
  "Too dry",
  "Too moist",
  "Didn't rise enough",
  "Rose too much",
  "Burnt crust",
  "Undercooked center",
  "Crumbly texture",
  "Gummy texture",
];

export const BakeOutcomeDialog = ({ open, onOpenChange, premixId, sessionId }: BakeOutcomeDialogProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  
  // Environmental data
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [season, setSeason] = useState("");
  const [altitude, setAltitude] = useState("");

  // Adjustments made
  const [waterAdjustment, setWaterAdjustment] = useState("");
  const [oilAdjustment, setOilAdjustment] = useState("");
  const [proofingAdjustment, setProofingAdjustment] = useState("");
  const [tempAdjustment, setTempAdjustment] = useState("");

  // Equipment
  const [ovenType, setOvenType] = useState("");
  const [mixingMethod, setMixingMethod] = useState("");

  const handleIssueToggle = (issue: string) => {
    setSelectedIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (rating === 0) {
      toast.error("Please provide a rating");
      return;
    }

    setSaving(true);
    try {
      const sessionData = {
        user_id: user.id,
        premix_id: premixId,
        completed_at: new Date().toISOString(),
        success_rating: rating,
        outcome_notes: notes || null,
        temperature_celsius: temperature ? parseFloat(temperature) : null,
        humidity_percent: humidity ? parseInt(humidity) : null,
        altitude_meters: altitude ? parseInt(altitude) : null,
        season: season || null,
        water_adjustment_ml: waterAdjustment ? parseInt(waterAdjustment) : null,
        oil_adjustment_ml: oilAdjustment ? parseInt(oilAdjustment) : null,
        proofing_time_adjustment_minutes: proofingAdjustment ? parseInt(proofingAdjustment) : null,
        baking_temp_adjustment_celsius: tempAdjustment ? parseInt(tempAdjustment) : null,
        oven_type: ovenType || null,
        mixing_method: mixingMethod || null,
        issues: selectedIssues.length > 0 ? selectedIssues : null,
      };

      let error;
      if (sessionId) {
        // Update existing session
        const result = await supabase
          .from("baking_sessions")
          .update(sessionData)
          .eq("id", sessionId);
        error = result.error;
      } else {
        // Create new session
        const result = await supabase.from("baking_sessions").insert(sessionData);
        error = result.error;
      }

      if (error) throw error;

      toast.success("Bake outcome saved! This will improve your future recommendations.");
      onOpenChange(false);
      
      // Reset form
      setRating(0);
      setNotes("");
      setSelectedIssues([]);
      setTemperature("");
      setHumidity("");
      setSeason("");
      setAltitude("");
      setWaterAdjustment("");
      setOilAdjustment("");
      setProofingAdjustment("");
      setTempAdjustment("");
      setOvenType("");
      setMixingMethod("");
    } catch (error: any) {
      console.error("Error saving bake outcome:", error);
      toast.error("Failed to save bake outcome");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How did your bake turn out?</DialogTitle>
          <DialogDescription>
            Your feedback helps us provide better personalized recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Rating */}
          <div>
            <Label className="mb-2 block">Overall Rating *</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRating(r)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      r <= rating ? "fill-primary text-primary" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Issues */}
          <div>
            <Label className="mb-2 block">Issues (if any)</Label>
            <div className="grid grid-cols-2 gap-2">
              {commonIssues.map((issue) => (
                <div key={issue} className="flex items-center space-x-2">
                  <Checkbox
                    id={issue}
                    checked={selectedIssues.includes(issue)}
                    onCheckedChange={() => handleIssueToggle(issue)}
                  />
                  <Label htmlFor={issue} className="text-sm cursor-pointer">
                    {issue}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="What went well? What would you change next time?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Environmental Conditions */}
          <div>
            <h3 className="font-medium mb-3">Environmental Conditions</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="temperature" className="text-xs">Kitchen Temp (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  placeholder="20"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="humidity" className="text-xs">Humidity (%)</Label>
                <Input
                  id="humidity"
                  type="number"
                  placeholder="50"
                  value={humidity}
                  onChange={(e) => setHumidity(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="season" className="text-xs">Season</Label>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger id="season">
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
              <div>
                <Label htmlFor="altitude" className="text-xs">Altitude (m)</Label>
                <Input
                  id="altitude"
                  type="number"
                  placeholder="0"
                  value={altitude}
                  onChange={(e) => setAltitude(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Recipe Adjustments */}
          <div>
            <h3 className="font-medium mb-3">Adjustments You Made</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="water" className="text-xs">Water (ml)</Label>
                <Input
                  id="water"
                  type="number"
                  placeholder="+/- ml"
                  value={waterAdjustment}
                  onChange={(e) => setWaterAdjustment(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="oil" className="text-xs">Oil (ml)</Label>
                <Input
                  id="oil"
                  type="number"
                  placeholder="+/- ml"
                  value={oilAdjustment}
                  onChange={(e) => setOilAdjustment(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="proofing" className="text-xs">Proofing Time (min)</Label>
                <Input
                  id="proofing"
                  type="number"
                  placeholder="+/- min"
                  value={proofingAdjustment}
                  onChange={(e) => setProofingAdjustment(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="temp" className="text-xs">Baking Temp (°C)</Label>
                <Input
                  id="temp"
                  type="number"
                  placeholder="+/- °C"
                  value={tempAdjustment}
                  onChange={(e) => setTempAdjustment(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Equipment */}
          <div>
            <h3 className="font-medium mb-3">Equipment Used</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="oven" className="text-xs">Oven Type</Label>
                <Select value={ovenType} onValueChange={setOvenType}>
                  <SelectTrigger id="oven">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conventional">Conventional</SelectItem>
                    <SelectItem value="convection">Convection/Fan</SelectItem>
                    <SelectItem value="gas">Gas</SelectItem>
                    <SelectItem value="wood-fired">Wood Fired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mixing" className="text-xs">Mixing Method</Label>
                <Select value={mixingMethod} onValueChange={setMixingMethod}>
                  <SelectTrigger id="mixing">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hand">By Hand</SelectItem>
                    <SelectItem value="stand-mixer">Stand Mixer</SelectItem>
                    <SelectItem value="hand-mixer">Hand Mixer</SelectItem>
                    <SelectItem value="food-processor">Food Processor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Outcome"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
