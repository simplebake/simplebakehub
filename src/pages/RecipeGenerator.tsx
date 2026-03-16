import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChefHat, Loader2, Sparkles, Clock, Users, BarChart3 } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ParsedRecipe {
  name: string;
  difficulty: string;
  prepTime: string;
  bakeTime: string;
  serves: string;
  description: string;
  ingredients: string;
  method: string;
  tips: string;
  allergenInfo: string;
}

const parseRecipe = (text: string): ParsedRecipe | null => {
  const r: ParsedRecipe = {
    name: "", difficulty: "", prepTime: "", bakeTime: "", serves: "",
    description: "", ingredients: "", method: "", tips: "", allergenInfo: ""
  };
  let currentKey = "";

  for (const line of text.split("\n")) {
    const upper = line.toUpperCase();
    if (upper.startsWith("RECIPE NAME:")) { currentKey = "name"; r.name = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("DIFFICULTY:")) { currentKey = "difficulty"; r.difficulty = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("PREP TIME:")) { currentKey = "prepTime"; r.prepTime = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("BAKE TIME:")) { currentKey = "bakeTime"; r.bakeTime = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("SERVES:")) { currentKey = "serves"; r.serves = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("DESCRIPTION:")) { currentKey = "description"; r.description = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("INGREDIENTS:")) { currentKey = "ingredients"; }
    else if (upper.startsWith("METHOD:")) { currentKey = "method"; }
    else if (upper.startsWith("TIPS:")) { currentKey = "tips"; }
    else if (upper.startsWith("ALLERGEN INFO:")) { currentKey = "allergenInfo"; r.allergenInfo = line.substring(line.indexOf(":") + 1).trim(); }
    else if (currentKey && line.trim()) {
      if (currentKey === "ingredients" || currentKey === "method" || currentKey === "tips") {
        r[currentKey] += (r[currentKey] ? "\n" : "") + line;
      } else {
        r[currentKey as keyof ParsedRecipe] += " " + line.trim();
      }
    }
  }
  return r.name ? r : null;
};

const RecipeGenerator = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState("");
  const [bakeType, setBakeType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [recipe, setRecipe] = useState<ParsedRecipe | null>(null);
  const [rawRecipe, setRawRecipe] = useState("");

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user) { navigate("/auth"); return null; }

  const handleGenerate = async () => {
    if (!ingredients.trim()) { toast.error("Please enter at least one ingredient"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipe", {
        body: { ingredients, bakeType, difficulty, dietaryNotes },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }
      setRawRecipe(data.recipe);
      setRecipe(parseRecipe(data.recipe));
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate recipe. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-primary" />
            Recipe Generator
          </h1>
          <p className="text-muted-foreground">Tell us what you have and we'll create a custom gluten-free recipe</p>
        </div>

        {/* Input form */}
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="ingredients" className="text-sm font-medium">
                What ingredients do you have? *
              </Label>
              <Textarea
                id="ingredients"
                placeholder="e.g. rice flour, eggs, coconut milk, sugar, butter, vanilla…"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Type of bake</Label>
                <Select value={bakeType} onValueChange={setBakeType}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bread">Bread</SelectItem>
                    <SelectItem value="cake">Cake</SelectItem>
                    <SelectItem value="cookies">Cookies</SelectItem>
                    <SelectItem value="muffins">Muffins</SelectItem>
                    <SelectItem value="pastry">Pastry</SelectItem>
                    <SelectItem value="pizza">Pizza</SelectItem>
                    <SelectItem value="pancakes">Pancakes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="dietary" className="text-sm font-medium">Additional dietary notes</Label>
              <Input
                id="dietary"
                placeholder="e.g. dairy-free, nut-free, low sugar…"
                value={dietaryNotes}
                onChange={(e) => setDietaryNotes(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <Button onClick={handleGenerate} disabled={generating} className="w-full" size="lg">
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Recipe…</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Recipe</>}
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        {recipe && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Recipe header */}
            <Card className="border-primary/30 bg-gradient-to-r from-primary/8 to-accent/6">
              <CardHeader>
                <CardTitle className="text-2xl">{recipe.name}</CardTitle>
                {recipe.description && <CardDescription className="text-base">{recipe.description.trim()}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {recipe.prepTime && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1 text-sm">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Prep: {recipe.prepTime}
                    </span>
                  )}
                  {recipe.bakeTime && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1 text-sm">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Bake: {recipe.bakeTime}
                    </span>
                  )}
                  {recipe.serves && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1 text-sm">
                      <Users className="h-3.5 w-3.5 text-primary" /> Serves: {recipe.serves}
                    </span>
                  )}
                  {recipe.difficulty && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1 text-sm">
                      <BarChart3 className="h-3.5 w-3.5 text-primary" /> {recipe.difficulty}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Ingredients */}
            {recipe.ingredients && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">🧈 Ingredients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{recipe.ingredients}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Method */}
            {recipe.method && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">👩‍🍳 Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{recipe.method}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            {recipe.tips && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">💡 Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{recipe.tips}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Allergen info */}
            {recipe.allergenInfo && (
              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="p-4">
                  <p className="text-sm"><span className="font-semibold">⚠️ Allergen Info:</span> {recipe.allergenInfo.trim()}</p>
                </CardContent>
              </Card>
            )}

            <Button variant="outline" onClick={() => { setRecipe(null); setRawRecipe(""); }} className="w-full">
              Generate Another Recipe
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default RecipeGenerator;
