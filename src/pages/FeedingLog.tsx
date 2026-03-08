import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { Header } from "@/components/Header";
import FeedingChart from "@/components/FeedingChart";
import { NotesField } from "@/components/NotesField";
import { InfoCallout } from "@/components/InfoCallout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Droplets, Thermometer, TrendingUp, Clock } from "lucide-react";
import { format, formatISO } from "date-fns";

const FLOUR_TYPES = ["Rice Flour", "Sorghum Flour", "Buckwheat Flour", "Millet Flour", "Oat Flour", "Teff Flour", "Tapioca Starch", "Custom Blend"];

const FeedingLog = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [starterName, setStarterName] = useState("My Starter");
  const [flourType, setFlourType] = useState("Rice Flour");
  const [flourAmount, setFlourAmount] = useState("50");
  const [waterAmount, setWaterAmount] = useState("50");
  const [waterUnit, setWaterUnit] = useState("g");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [risePercentage, setRisePercentage] = useState("");
  const [peakHours, setPeakHours] = useState("");
  const [notes, setNotes] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["feeding-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feeding_logs")
        .select("*")
        .order("fed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addLog = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("feeding_logs").insert({
        user_id: user.id,
        starter_name: starterName,
        flour_type: flourType,
        flour_amount_g: parseFloat(flourAmount) || 50,
        water_amount_g: parseFloat(waterAmount) || 50,
        water_unit: waterUnit,
        temperature_celsius: temperature ? parseFloat(temperature) : null,
        humidity_percent: humidity ? parseInt(humidity) : null,
        rise_percentage: risePercentage ? parseFloat(risePercentage) : null,
        peak_hours: peakHours ? parseFloat(peakHours) : null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeding-logs"] });
      toast({ title: "Feeding logged! 🌾", description: "Your starter feeding has been recorded." });
      setTemperature("");
      setHumidity("");
      setRisePercentage("");
      setPeakHours("");
      setNotes("");
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feeding_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeding-logs"] });
      toast({ title: "Deleted", description: "Feeding log removed." });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-4xl px-4 py-8">
          <InfoCallout variant="info" title="Sign in required">
            Please sign in to track your sourdough starter feedings.
          </InfoCallout>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feeding Log</h1>
          <p className="text-muted-foreground">Track your sourdough starter feedings and monitor its activity over time.</p>
        </div>

        <InfoCallout variant="tip" title="Pro Tip">
          Consistent feeding times and ratios help your starter become more predictable. Log the rise percentage and peak time to spot patterns.
        </InfoCallout>

        {/* Add Feeding Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Log a Feeding
            </CardTitle>
            <CardDescription>Record what you fed your starter and how it responded.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Starter Name</Label>
                <Input value={starterName} onChange={(e) => setStarterName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Flour Type</Label>
                <Select value={flourType} onValueChange={setFlourType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FLOUR_TYPES.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" /> Flour (g)</Label>
                <Input type="number" value={flourAmount} onChange={(e) => setFlourAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" /> Water</Label>
                <div className="flex gap-2">
                  <Input type="number" value={waterAmount} onChange={(e) => setWaterAmount(e.target.value)} className="flex-1" />
                  <Select value={waterUnit} onValueChange={setWaterUnit}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Thermometer className="h-3.5 w-3.5" /> Temp (°C)</Label>
                <Input type="number" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Humidity (%)</Label>
                <Input type="number" value={humidity} onChange={(e) => setHumidity(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Rise (%)</Label>
                <Input type="number" value={risePercentage} onChange={(e) => setRisePercentage(e.target.value)} placeholder="e.g. 150" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Peak (hours)</Label>
                <Input type="number" step="0.5" value={peakHours} onChange={(e) => setPeakHours(e.target.value)} placeholder="e.g. 6" />
              </div>
            </div>
            <NotesField value={notes} onChange={setNotes} placeholder="How did the starter look? Any changes?" />
            <Button onClick={() => addLog.mutate()} disabled={addLog.isPending}>
              {addLog.isPending ? "Saving…" : "Log Feeding"}
            </Button>
          </CardContent>
        </Card>

        {/* Chart */}
        <FeedingChart
          entries={(logs as any[]).map((log: any) => {
            const dt = new Date(log.fed_at);
            return {
              id: log.id,
              date: formatISO(dt, { representation: "date" }),
              time: format(dt, "HH:mm"),
              flourAmount: Number(log.flour_amount_g),
              waterAmount: Number(log.water_amount_g),
              temperature: Number(log.temperature_celsius ?? 0),
              notes: log.notes ?? "",
            };
          })}
        />

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>Feeding History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedings logged yet. Add your first one above!</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex items-start justify-between rounded-lg border p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{log.starter_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.fed_at), "dd MMM yyyy, HH:mm")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.flour_type} · {log.flour_amount_g}g flour · {log.water_amount_g}{log.water_unit || 'g'} water
                        {log.temperature_celsius && ` · ${log.temperature_celsius}°C`}
                        {log.rise_percentage && ` · ${log.rise_percentage}% rise`}
                        {log.peak_hours && ` · ${log.peak_hours}h peak`}
                      </p>
                      {log.notes && <p className="text-xs text-foreground/70">{log.notes}</p>}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => deleteLog.mutate(log.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FeedingLog;
