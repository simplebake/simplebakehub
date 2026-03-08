import { useState } from "react";
import { Header } from "@/components/Header";
import { InfoCallout } from "@/components/InfoCallout";
import ProgressStepper from "@/components/ProgressStepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FlaskConical, ArrowRight, RotateCcw } from "lucide-react";

const questions = [
  {
    label: "Activity",
    question: "How active is your starter after feeding?",
    options: [
      { value: "none", label: "No rise at all" },
      { value: "slow", label: "Rises slowly (12+ hours to peak)" },
      { value: "moderate", label: "Doubles in 6-10 hours" },
      { value: "strong", label: "Doubles or triples in 4-6 hours" },
    ],
  },
  {
    label: "Smell",
    question: "How does your starter smell?",
    options: [
      { value: "bad", label: "Strong off-putting or rotten smell" },
      { value: "acetone", label: "Nail polish / acetone smell" },
      { value: "vinegary", label: "Sharp, vinegary" },
      { value: "pleasant", label: "Pleasantly tangy or yeasty" },
    ],
  },
  {
    label: "Appearance",
    question: "What does the surface look like?",
    options: [
      { value: "liquid", label: "Very runny/liquid with hooch on top" },
      { value: "flat", label: "Thick but flat, no bubbles" },
      { value: "some_bubbles", label: "Some bubbles throughout" },
      { value: "bubbly", label: "Very bubbly and domed" },
    ],
  },
  {
    label: "Float Test",
    question: "Does a spoonful float in water at peak?",
    options: [
      { value: "sinks", label: "Sinks immediately" },
      { value: "partial", label: "Floats briefly then sinks" },
      { value: "floats", label: "Floats easily" },
      { value: "untested", label: "Haven't tested" },
    ],
  },
];

const getDiagnosis = (answers: Record<number, string>) => {
  const score = Object.values(answers).reduce((acc, val) => {
    const scores: Record<string, number> = {
      none: 0, bad: 0, liquid: 0, sinks: 0,
      slow: 1, acetone: 1, flat: 1, partial: 1,
      moderate: 2, vinegary: 2, some_bubbles: 2, untested: 2,
      strong: 3, pleasant: 3, bubbly: 3, floats: 3,
    };
    return acc + (scores[val] ?? 1);
  }, 0);

  if (score <= 3) return { status: "Needs Help 🆘", message: "Your starter is struggling. Feed it twice daily with equal parts flour and water at a warm temperature (25-28°C). Discard all but 50g before each feed. It may take 7-14 days to recover.", variant: "warning" as const };
  if (score <= 7) return { status: "Getting There 🌱", message: "Your starter is developing but not ready for baking. Keep feeding consistently once or twice daily. Watch for increasing activity over the next few days.", variant: "info" as const };
  if (score <= 10) return { status: "Almost Ready 💪", message: "Your starter is looking good! It's nearly ready for baking. Do the float test at peak to confirm. One or two more days of consistent feeding should do it.", variant: "info" as const };
  return { status: "Ready to Bake! 🎉", message: "Your starter is active and healthy. It should reliably pass the float test at peak. Use it 4-6 hours after feeding when it's at its most active.", variant: "success" as const };
};

const StarterChecker = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentStep]: value }));
  };

  const next = () => {
    if (currentStep < questions.length - 1) setCurrentStep((s) => s + 1);
    else setShowResult(true);
  };

  const reset = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResult(false);
  };

  const diagnosis = showResult ? getDiagnosis(answers) : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" /> Starter Health Check
          </h1>
          <p className="text-muted-foreground">Answer a few questions to see if your starter is ready to bake.</p>
        </div>

        <ProgressStepper
          current={showResult ? questions.length : currentStep + 1}
          total={questions.length}
        />

        {!showResult ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{questions[currentStep].question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={answers[currentStep] || ""} onValueChange={handleAnswer}>
                {questions[currentStep].options.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.value} id={opt.value} />
                    <Label htmlFor={opt.value}>{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="flex gap-2 pt-2">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)}>Back</Button>
                )}
                <Button onClick={next} disabled={!answers[currentStep]}>
                  {currentStep < questions.length - 1 ? (
                    <>Next <ArrowRight className="ml-1 h-4 w-4" /></>
                  ) : "See Result"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : diagnosis && (
          <div className="space-y-4">
            <InfoCallout variant={diagnosis.variant} title={diagnosis.status}>
              {diagnosis.message}
            </InfoCallout>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" /> Check Again
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default StarterChecker;
