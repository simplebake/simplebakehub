import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Send, Upload, CheckCircle2, AlertTriangle, XCircle, RotateCcw } from "lucide-react";
import { issues, questionsPerIssue, getResult, type IssueId, type StatusLevel, type Result } from "@/data/starterTroubleshooting";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

type Screen = "intro" | "select_issue" | "questions" | "results" | "support";

const statusConfig: Record<StatusLevel, { icon: typeof CheckCircle2; label: string; className: string }> = {
  green: { icon: CheckCircle2, label: "Normal — keep going", className: "text-success bg-success/10 border-success/30" },
  amber: { icon: AlertTriangle, label: "Adjust & monitor", className: "text-warning bg-warning/10 border-warning/30" },
  red: { icon: XCircle, label: "Restart recommended", className: "text-destructive bg-destructive/10 border-destructive/30" },
};

const StarterTroubleshooting = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [screen, setScreen] = useState<Screen>("intro");
  const [selectedIssue, setSelectedIssue] = useState<IssueId | null>(null);
  const [questionStep, setQuestionStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);

  // Support form state
  const [supportNotes, setSupportNotes] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentQuestions = selectedIssue ? questionsPerIssue[selectedIssue] : [];
  const currentQuestion = currentQuestions[questionStep];
  const totalQuestions = currentQuestions.length;

  const handleIssueSelect = (id: IssueId) => {
    setSelectedIssue(id);
    setScreen("questions");
    setQuestionStep(0);
    setAnswers({});
  };

  const handleAnswer = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    setTimeout(() => {
      if (questionStep + 1 >= totalQuestions) {
        const res = getResult(selectedIssue!, newAnswers);
        setResult(res);
        setScreen("results");
      } else {
        setQuestionStep((s) => s + 1);
      }
    }, 200);
  };

  const handleReset = () => {
    setScreen("intro");
    setSelectedIssue(null);
    setQuestionStep(0);
    setAnswers({});
    setResult(null);
    setSubmitted(false);
    setSupportNotes("");
    setOrderNumber("");
    setPhotoFile(null);
  };

  const handleSubmitSupport = async () => {
    setSubmitting(true);
    try {
      let photoUrl: string | null = null;

      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `troubleshooting/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("bake-photos").upload(path, photoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("bake-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("customer_messages").insert({
        user_id: user?.id || null,
        email: null,
        subject: `Starter Troubleshooting: ${selectedIssue}`,
        category: "troubleshooting",
        message: [
          `Issue: ${selectedIssue}`,
          `Answers: ${JSON.stringify(answers)}`,
          `Result: ${result?.likelyCause}`,
          orderNumber ? `Order: ${orderNumber}` : null,
          supportNotes ? `Notes: ${supportNotes}` : null,
          photoUrl ? `Photo: ${photoUrl}` : null,
        ].filter(Boolean).join("\n"),
      });

      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Support request sent!", description: "We'll get back to you as soon as we can." });
    } catch (err) {
      toast({ title: "Something went wrong", description: "Please try again or email us directly.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = screen === "questions" ? Math.round(((questionStep + 1) / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-xl px-4 py-6 space-y-6">
        <AppHeader title="Starter Troubleshooting" />

        {/* INTRO */}
        {screen === "intro" && (
          <div className="space-y-6 text-center pt-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
              🔍
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Starter Troubleshooting</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Answer a few quick questions and get the most likely cause and next step.
              </p>
            </div>
            <Button size="lg" className="w-full max-w-xs" onClick={() => setScreen("select_issue")}>
              Start <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* PROBLEM SELECTION */}
        {screen === "select_issue" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">What's happening with your starter?</h2>
              <p className="text-sm text-muted-foreground mt-1">Select the issue that best describes it.</p>
            </div>
            <div className="grid gap-3">
              {issues.map((issue) => (
                <Card
                  key={issue.id}
                  className="cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]"
                  onClick={() => handleIssueSelect(issue.id)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                      {issue.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{issue.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          </div>
        )}

        {/* GUIDED QUESTIONS */}
        {screen === "questions" && currentQuestion && (
          <div className="space-y-5">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Question {questionStep + 1} of {totalQuestions}</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <h2 className="text-lg font-semibold text-foreground">{currentQuestion.text}</h2>

            <div className="space-y-2">
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(currentQuestion.id, opt.value)}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 text-sm font-medium transition-all active:scale-[0.98]",
                    answers[currentQuestion.id] === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (questionStep === 0) {
                  setScreen("select_issue");
                } else {
                  setQuestionStep((s) => s - 1);
                }
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          </div>
        )}

        {/* RESULTS */}
        {screen === "results" && result && (
          <div className="space-y-5">
            {/* Status badge */}
            {(() => {
              const cfg = statusConfig[result.status];
              const Icon = cfg.icon;
              return (
                <div className={cn("rounded-xl border p-4 flex items-center gap-3", cfg.className)}>
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-semibold">{cfg.label}</span>
                </div>
              );
            })()}

            {/* Likely cause */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Likely cause</p>
                  <p className="text-base font-semibold text-foreground mt-1">{result.likelyCause}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">What this usually means</p>
                  <p className="text-sm text-foreground mt-1">{result.meaning}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Recommended next step</p>
                  <p className="text-sm text-foreground mt-1">{result.nextStep}</p>
                </div>

                <div className="flex gap-4 pt-2 text-xs text-muted-foreground">
                  <span>Wait longer? <strong className="text-foreground">{result.waitLonger ? "Yes" : "No"}</strong></span>
                  <span>Restart? <strong className="text-foreground">{result.restart ? "Yes" : "No"}</strong></span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Start Over
              </Button>
              <Button className="flex-1" onClick={() => setScreen("support")}>
                Need More Help
              </Button>
            </div>
          </div>
        )}

        {/* SUPPORT FALLBACK */}
        {screen === "support" && !submitted && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Get extra help</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Send us the details and we'll help you out.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Upload a photo of your starter</label>
                <label
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground cursor-pointer hover:border-primary/40 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  {photoFile ? photoFile.name : "Tap to upload a photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Notes</label>
                <Textarea
                  placeholder="Describe what you're seeing..."
                  value={supportNotes}
                  onChange={(e) => setSupportNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Order number (optional)</label>
                <Input
                  placeholder="e.g. SB-12345"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setScreen("results")}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button className="flex-1" onClick={handleSubmitSupport} disabled={submitting}>
                <Send className="mr-2 h-4 w-4" />
                {submitting ? "Sending…" : "Submit"}
              </Button>
            </div>
          </div>
        )}

        {/* SUPPORT SUBMITTED */}
        {screen === "support" && submitted && (
          <div className="space-y-6 text-center pt-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Request sent!</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                We've received your details and will get back to you as soon as we can. Happy baking! 🍞
              </p>
            </div>
            <div className="flex gap-3 max-w-xs mx-auto">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Start Over
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => navigate("/")}>
                Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StarterTroubleshooting;
