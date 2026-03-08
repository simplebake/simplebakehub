import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import ProgressStepper from "@/components/ProgressStepper";
import { InfoCallout } from "@/components/InfoCallout";
import { NotesField } from "@/components/NotesField";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

interface Question {
  id: string;
  text: string;
  options: { label: string; value: string; score: number }[];
  tip?: string;
}

const questions: Question[] = [
  {
    id: "feeding_time",
    text: "How long ago did you last feed your starter?",
    options: [
      { label: "Less than 4 hours", value: "lt4", score: 0 },
      { label: "4–8 hours", value: "4-8", score: 2 },
      { label: "8–12 hours", value: "8-12", score: 3 },
      { label: "More than 12 hours", value: "gt12", score: 1 },
    ],
  },
  {
    id: "temperature",
    text: "What's your room temperature roughly?",
    options: [
      { label: "Cool (below 20°C / 68°F)", value: "cool", score: 1 },
      { label: "Moderate (20–25°C / 68–78°F)", value: "moderate", score: 3 },
      { label: "Warm (above 25°C / 78°F)", value: "warm", score: 2 },
    ],
    tip: "Keep your starter at a consistent 24°C for optimal fermentation. A warm kitchen corner or proofing box works great. Avoid drafts and direct sunlight.",
  },
  {
    id: "rise",
    text: "Has your starter risen since the last feeding?",
    options: [
      { label: "Doubled or nearly doubled", value: "doubled", score: 4 },
      { label: "Rose about 50%", value: "half", score: 2 },
      { label: "Barely rose", value: "barely", score: 0 },
      { label: "It rose and has started to fall back", value: "falling", score: 3 },
    ],
    tip: "Gluten-free starters often won't dome like wheat starters. You'll know it's ready when it's bubbly and has a pleasant sour smell.",
  },
  {
    id: "bubbles",
    text: "How bubbly is the surface and sides?",
    options: [
      { label: "Lots of bubbles throughout", value: "lots", score: 4 },
      { label: "Some bubbles on top and sides", value: "some", score: 2 },
      { label: "Very few or no bubbles", value: "few", score: 0 },
    ],
  },
  {
    id: "aroma",
    text: "How does it smell?",
    options: [
      { label: "Pleasantly tangy / yeasty", value: "tangy", score: 3 },
      { label: "Mildly sour", value: "mild", score: 2 },
      { label: "Very sour or like acetone", value: "strong", score: 0 },
      { label: "No smell yet", value: "none", score: 1 },
    ],
    tip: "A mild tangy aroma means healthy fermentation. A strong vinegar or acetone smell may mean it's over-fermented.",
  },
  {
    id: "texture",
    text: "What's the consistency like?",
    options: [
      { label: "Thick, mousse-like, and airy", value: "mousse", score: 3 },
      { label: "Pourable but bubbly", value: "pourable", score: 2 },
      { label: "Thin, watery, or separated", value: "thin", score: 0 },
    ],
  },
];

const totalMaxScore = 20;

type Result = "ready" | "almost" | "not_ready";

function getResult(score: number): Result {
  if (score >= 15) return "ready";
  if (score >= 9) return "almost";
  return "not_ready";
}

const resultData: Record<Result, { title: string; description: string; color: string }> = {
  ready: {
    title: "🎉 Your starter looks ready!",
    description: "It shows strong signs of activity. Go ahead and mix your dough — the sooner the better so it doesn't over-ferment.",
    color: "bg-success/15 border-success/40",
  },
  almost: {
    title: "⏳ Almost there!",
    description: "Your starter is showing activity but may need 30–60 more minutes. Check again soon for more bubbles and a slight rise.",
    color: "bg-warning/15 border-warning/40",
  },
  not_ready: {
    title: "🕐 Needs more time or another feeding",
    description: "Your starter isn't showing enough activity yet. Give it more time in a warm spot, or try another feeding with equal parts flour blend and water.",
    color: "bg-muted border-border",
  },
};

const troubleshootingTips = [
  { title: "Starter not bubbling?", tip: "Give it more time or place it in a warmer spot. Keep it at a consistent 24°C — a warm kitchen corner or proofing box works great." },
  { title: "Overripe / collapsed", tip: "Feed it again by discarding half and adding fresh water and flour (26g water & 30g flour). Wait for it to peak before using." },
  { title: "Very sour / acetone smell", tip: "This means it's hungry. Feed it twice a day for a couple of days to balance the acidity. Stir daily for proper fermentation." },
  { title: "Liquid on top (hooch)", tip: "This is normal — it means your starter is hungry. Stir it back in or pour it off, then feed." },
  { title: "Low activity after many days", tip: "Gluten-free starters can take 2–3 days from dried to fully active. Be patient, keep feeding consistently at 24°C, and stir daily." },
  { title: "Bread not rising?", tip: "Check that your starter is truly active (bubbly, pleasant sour smell) and that your room temperature is warm enough." },
];

const StarterChecker = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [notesValue, setNotesValue] = useState("");
  const navigate = useNavigate();

  const done = step >= questions.length;
  const score = Object.values(answers).reduce((a, b) => a + b, 0);
  const result = done ? getResult(score) : null;

  const handleSelect = (questionId: string, optionScore: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionScore }));
    setTimeout(() => setStep((s) => s + 1), 250);
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
  };

  const q = questions[step];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-xl px-4 py-6 space-y-6">
        <AppHeader title="Starter Health Check" />

        <ProgressStepper current={done ? questions.length : step + 1} total={questions.length} />

        {!done && q && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{q.text}</h2>
            {q.tip && (
              <InfoCallout variant="tip" title="Tip">
                {q.tip}
              </InfoCallout>
            )}
            <div className="space-y-2">
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(q.id, opt.score)}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 text-sm font-medium transition-all active:scale-[0.98]",
                    answers[q.id] === opt.score
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                ← Back
              </Button>
            )}
          </div>
        )}

        {done && result && (
          <div className="space-y-6">
            <div className={cn("rounded-xl border p-5 space-y-2", resultData[result].color)}>
              <h2 className="text-lg font-bold text-foreground">{resultData[result].title}</h2>
              <p className="text-sm text-muted-foreground">{resultData[result].description}</p>
            </div>

            {result === "ready" && (
              <Button className="w-full" onClick={() => navigate("/dough-assistant")}>
                Let's make dough →
              </Button>
            )}

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Troubleshooting Tips</h3>
              {troubleshootingTips.map((t) => (
                <details key={t.title} className="rounded-xl border border-border bg-card p-4">
                  <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-foreground">
                    {t.title}
                    <span className="text-muted-foreground">+</span>
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">{t.tip}</p>
                </details>
              ))}
            </div>

            <NotesField
              value={notesValue}
              onChange={setNotesValue}
              label="Your Notes"
              placeholder="Jot down observations about your starter…"
            />

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Check Again
              </Button>
              <Button variant="secondary" onClick={() => navigate("/")} className="flex-1">
                Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StarterChecker;
