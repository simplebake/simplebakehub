import { useState } from "react";
import { Header } from "@/components/Header";
import { InfoCallout } from "@/components/InfoCallout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Droplets, Thermometer } from "lucide-react";

const DoughAssistant = () => {
  const [flourWeight, setFlourWeight] = useState("300");
  const [hydration, setHydration] = useState("75");
  const [starterPct, setStarterPct] = useState("20");
  const [saltPct, setSaltPct] = useState("2");
  const [flourType, setFlourType] = useState("rice");
  const [temperature, setTemperature] = useState("24");

  const flour = parseFloat(flourWeight) || 0;
  const water = flour * ((parseFloat(hydration) || 75) / 100);
  const starter = flour * ((parseFloat(starterPct) || 20) / 100);
  const salt = flour * ((parseFloat(saltPct) || 2) / 100);
  const totalWeight = flour + water + starter + salt;

  const temp = parseFloat(temperature) || 24;
  const estimatedBulkHours = temp >= 28 ? "3-5" : temp >= 24 ? "5-8" : temp >= 20 ? "8-12" : "12-18";

  const flourAdjustments: Record<string, string> = {
    rice: "Rice flour absorbs less water. Start at 70-75% hydration.",
    sorghum: "Sorghum can handle 75-80% hydration. Adds a mild sweetness.",
    buckwheat: "Buckwheat is dense — blend with rice flour (50/50) for lighter crumb.",
    millet: "Millet flour works well at 70-75% hydration. Mild flavour.",
    teff: "Teff is very absorbent. You may need 80-85% hydration.",
    oat: "Oat flour adds moisture — reduce hydration by 5% from your usual.",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" /> Dough Calculator
          </h1>
          <p className="text-muted-foreground">Calculate hydration, ingredients, and get gluten-free flour tips.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
            <CardDescription>Enter your flour weight and desired percentages (baker's math).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Flour Type</Label>
                <Select value={flourType} onValueChange={setFlourType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rice">Rice Flour</SelectItem>
                    <SelectItem value="sorghum">Sorghum Flour</SelectItem>
                    <SelectItem value="buckwheat">Buckwheat Flour</SelectItem>
                    <SelectItem value="millet">Millet Flour</SelectItem>
                    <SelectItem value="teff">Teff Flour</SelectItem>
                    <SelectItem value="oat">Oat Flour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Flour Weight (g)</Label>
                <Input type="number" value={flourWeight} onChange={(e) => setFlourWeight(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" /> Hydration (%)</Label>
                <Input type="number" value={hydration} onChange={(e) => setHydration(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Starter (%)</Label>
                <Input type="number" value={starterPct} onChange={(e) => setStarterPct(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Salt (%)</Label>
                <Input type="number" value={saltPct} onChange={(e) => setSaltPct(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Thermometer className="h-3.5 w-3.5" /> Room Temp (°C)</Label>
                <Input type="number" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Recipe Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Flour", value: `${flour.toFixed(0)}g` },
                { label: "Water", value: `${water.toFixed(0)}g` },
                { label: "Starter", value: `${starter.toFixed(0)}g` },
                { label: "Salt", value: `${salt.toFixed(1)}g` },
                { label: "Total Dough", value: `${totalWeight.toFixed(0)}g` },
                { label: "Est. Bulk Ferment", value: `${estimatedBulkHours} hours` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <InfoCallout variant="tip" title={`${flourType.charAt(0).toUpperCase() + flourType.slice(1)} Flour Tip`}>
          {flourAdjustments[flourType]}
        </InfoCallout>
      </main>
    </div>
  );
};

export default DoughAssistant;
