import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import ProgressStepper from "@/components/ProgressStepper";
import { InfoCallout } from "@/components/InfoCallout";
import BakeTimer from "@/components/BakeTimer";
import { NotesField } from "@/components/NotesField";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { RotateCcw, ChevronRight, ChevronLeft, Check, AlertTriangle } from "lucide-react";
import { recipes } from "@/data/recipes";
import { RecipePersonaliserBanner } from "@/components/RecipePersonaliserBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";

const DoughAssistant = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useLocalStorage<string | null>("dough-recipe-id", null);
  const [currentStep, setCurrentStep] = useLocalStorage<number>("dough-step", 0);
  const [completedSteps, setCompletedSteps] = useLocalStorage<number[]>("dough-completed", []);
  const [notesValue, setNotesValue] = useState("");
  const [premixDbId, setPremixDbId] = useState<string | undefined>(undefined);

  const recipe = recipes.find((r) => r.id === selectedId) ?? null;
  const steps = recipe?.steps ?? [];
  const step = steps[currentStep];

  // Look up the database premix ID by matching the recipe name
  useEffect(() => {
    if (!recipe || !user) {
      setPremixDbId(undefined);
      return;
    }
    const lookupPremix = async () => {
      const { data } = await supabase
        .from("premixes")
        .select("id")
        .ilike("name", `%${recipe.name.split(" ")[0]}%`)
        .limit(1)
        .maybeSingle();
      setPremixDbId(data?.id ?? undefined);
    };
    lookupPremix();
  }, [recipe?.id, user]);

  const selectRecipe = (id: string) => {
    setSelectedId(id);
    setCurrentStep(0);
    setCompletedSteps([]);
  };

  const markComplete = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const reset = () => {
    setSelectedId(null);
    setCurrentStep(0);
    setCompletedSteps([]);
  };

  // Recipe selection screen
  if (!recipe) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-xl px-4 py-6 space-y-6">
          <AppHeader title="Dough Assistant" />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Choose your recipe</h2>

            <p className="text-sm text-muted-foreground">
              Select a recipe and we'll guide you through each step.
            </p>

            <div className="space-y-3">
              {recipes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectRecipe(r.id)}
                  className="w-full rounded-xl border border-border bg-card p-5 text-left hover:shadow-lg active:scale-[0.98] transition-all"
                >
                  <span className="font-semibold text-foreground">{r.name}</span>
                  <p className="text-sm text-foreground/70 mt-0.5">{r.subtitle}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.premix} · {r.steps.length} steps
                  </p>
                  {r.allergens && (
                    <p className="text-xs text-warning flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" /> {r.allergens}
                    </p>
                  )}
                </button>
              ))}
            </div>

            <InfoCallout variant="tip" title="Getting Started">
              Make sure your starter is bubbly and active before you begin!
            </InfoCallout>
          </div>
        </div>
      </div>
    );
  }

  const allDone = currentStep === steps.length - 1 && completedSteps.includes(currentStep);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-xl px-4 py-6 space-y-6">
        <AppHeader title={recipe.name} />

        <ProgressStepper current={completedSteps.length} total={steps.length} />

        {/* Personalised recipe adjustments */}
        {currentStep === 0 && premixDbId && (
          <RecipePersonaliserBanner premixId={premixDbId} premixName={recipe.name} />
        )}

        {/* Ingredients & Equipment */}
        <details className="rounded-xl border border-border bg-card p-4">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-foreground">
            📋 Ingredients & Equipment
            <span className="text-muted-foreground">+</span>
          </summary>
          <div className="mt-3 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Ingredients</h4>
              <ul className="space-y-1">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    • <span className="text-foreground">{ing.amount}</span> {ing.name}
                  </li>
                ))}
              </ul>
            </div>
            {recipe.equipment.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Equipment</h4>
                <ul className="space-y-1">
                  {recipe.equipment.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
            {recipe.allergens && (
              <p className="text-xs text-warning flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {recipe.allergens}
              </p>
            )}
          </div>
        </details>

        {/* Step indicator dots */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={cn(
                "shrink-0 w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all",
                i === currentStep
                  ? "bg-primary text-primary-foreground"
                  : completedSteps.includes(i)
                  ? "bg-success/20 text-success"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {completedSteps.includes(i) ? <Check className="h-4 w-4" /> : i + 1}
            </button>
          ))}
        </div>

        {/* Current step */}
        {step && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{step.title}</h2>
            <p className="text-sm text-muted-foreground">{step.description}</p>

            {step.lookFor && (
              <InfoCallout variant="tip" title="What to look for">
                {step.lookFor}
              </InfoCallout>
            )}

            {step.timerMinutes && step.timerLabel && (
              <BakeTimer durationMinutes={step.timerMinutes} label={step.timerLabel} />
            )}

            {step.troubleshoot && step.troubleshoot.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Troubleshooting</h3>
                {step.troubleshoot.map((t) => (
                  <details key={t.q} className="rounded-xl border border-border bg-card p-3">
                    <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-foreground">
                      {t.q}
                      <span className="text-muted-foreground">+</span>
                    </summary>
                    <p className="mt-2 text-sm text-muted-foreground">{t.a}</p>
                  </details>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {currentStep > 0 && (
                <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
              )}
              <Button onClick={markComplete} className="gap-1">
                {currentStep < steps.length - 1 ? (
                  <>Done — Next <ChevronRight className="h-4 w-4" /></>
                ) : (
                  <>Mark Complete <Check className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Completion message */}
        {allDone && (
          <div className="pt-2">
            <div className="rounded-xl border border-success/40 bg-success/15 p-5 space-y-2">
              <h2 className="text-lg font-bold text-foreground">🍞 You did it!</h2>
              <p className="text-sm text-muted-foreground">
                Your {recipe.name.toLowerCase()} is done. Enjoy every bite!
              </p>
            </div>
          </div>
        )}

        <NotesField
          value={notesValue}
          onChange={setNotesValue}
          label="Your Notes"
          placeholder="Jot down observations about this bake…"
        />

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" /> Choose Another Recipe
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")} className="text-sm">
            Home
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          General baking guidance only. Results vary by environment and ingredients.
        </p>
      </div>
    </div>
  );
};

export default DoughAssistant;
