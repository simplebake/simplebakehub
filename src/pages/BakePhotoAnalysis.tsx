import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Upload, Loader2, Sparkles, Star, ChevronRight } from "lucide-react";

interface ParsedAnalysis {
  score: string;
  crust: string;
  crumb: string;
  shape: string;
  colour: string;
  textureClues: string;
  strengths: string;
  improvements: string;
  verdict: string;
}

const parseAnalysis = (text: string): ParsedAnalysis | null => {
  const result: ParsedAnalysis = {
    score: "", crust: "", crumb: "", shape: "", colour: "",
    textureClues: "", strengths: "", improvements: "", verdict: ""
  };
  let currentKey = "";

  for (const line of text.split("\n")) {
    const upper = line.toUpperCase();
    if (upper.startsWith("OVERALL SCORE:")) { currentKey = "score"; result.score = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("CRUST:")) { currentKey = "crust"; result.crust = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("CRUMB:")) { currentKey = "crumb"; result.crumb = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("SHAPE:")) { currentKey = "shape"; result.shape = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("COLOUR:")) { currentKey = "colour"; result.colour = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("TEXTURE CLUES:")) { currentKey = "textureClues"; result.textureClues = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("STRENGTHS:")) { currentKey = "strengths"; result.strengths = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("IMPROVEMENTS:")) { currentKey = "improvements"; result.improvements = line.substring(line.indexOf(":") + 1).trim(); }
    else if (upper.startsWith("VERDICT:")) { currentKey = "verdict"; result.verdict = line.substring(line.indexOf(":") + 1).trim(); }
    else if (currentKey && line.trim()) {
      result[currentKey as keyof ParsedAnalysis] += " " + line.trim();
    }
  }
  return result.score ? result : null;
};

const BakePhotoAnalysis = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState<ParsedAnalysis | null>(null);
  const [rawAnalysis, setRawAnalysis] = useState<string>("");

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user) { navigate("/auth"); return null; }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
      setAnalysis(null);
      setRawAnalysis("");
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyse = async () => {
    if (!imagePreview) return;
    setAnalysing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-bake-photo", {
        body: { imageBase64: imagePreview },
      });
      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setRawAnalysis(data.analysis);
      setAnalysis(parseAnalysis(data.analysis));
    } catch (err) {
      console.error(err);
      toast.error("Failed to analyse photo. Please try again.");
    } finally {
      setAnalysing(false);
    }
  };

  const scoreNum = analysis?.score ? parseInt(analysis.score) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Camera className="h-8 w-8 text-primary" />
            Bake Photo Analysis
          </h1>
          <p className="text-muted-foreground">Upload a photo of your bake and get AI-powered feedback on texture, colour, and more</p>
        </div>

        {/* Upload area */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

            {!imagePreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-muted-foreground/30 rounded-xl p-12 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="text-lg font-medium">Drop your bake photo here</span>
                <span className="text-sm text-muted-foreground">or click to browse · JPG, PNG under 10MB</span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden">
                  <img src={imagePreview} alt="Your bake" className="w-full max-h-96 object-contain bg-muted rounded-xl" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setImagePreview(null); setAnalysis(null); setRawAnalysis(""); }}>
                    Choose Different Photo
                  </Button>
                  <Button onClick={handleAnalyse} disabled={analysing} className="flex-1">
                    {analysing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analysing…</> : <><Sparkles className="h-4 w-4 mr-2" />Analyse My Bake</>}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {analysis && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Score */}
            <Card className="border-primary/30 bg-gradient-to-r from-primary/8 to-accent/6">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Star className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Overall Score</p>
                  <p className="text-3xl font-bold text-foreground">{analysis.score}</p>
                </div>
              </CardContent>
            </Card>

            {/* Detailed sections */}
            {[
              { label: "Crust", value: analysis.crust, emoji: "🍞" },
              { label: "Crumb", value: analysis.crumb, emoji: "🔍" },
              { label: "Shape", value: analysis.shape, emoji: "📐" },
              { label: "Colour", value: analysis.colour, emoji: "🎨" },
              { label: "Texture Clues", value: analysis.textureClues, emoji: "✋" },
            ].filter(s => s.value).map(({ label, value, emoji }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-start gap-3">
                  <span className="text-xl">{emoji}</span>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Strengths & Improvements */}
            <div className="grid sm:grid-cols-2 gap-4">
              {analysis.strengths && (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5">💪 Strengths</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">{analysis.strengths}</p>
                  </CardContent>
                </Card>
              )}
              {analysis.improvements && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5">🎯 Improvements</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">{analysis.improvements}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Verdict */}
            {analysis.verdict && (
              <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-foreground italic">"{analysis.verdict.trim()}"</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default BakePhotoAnalysis;
