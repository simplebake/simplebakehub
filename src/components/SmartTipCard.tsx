import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SmartTipCardProps {
  context: "guided_bake" | "product_page" | "home";
  premixName?: string;
  stepTitle?: string;
  difficulty?: string;
}

export const SmartTipCard = ({ context, premixName, stepTitle, difficulty }: SmartTipCardProps) => {
  const [tip, setTip] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTip = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke("generate-smart-tip", {
          body: { context, premixName, stepTitle, difficulty }
        });

        if (error) throw error;
        setTip(data.tip);
      } catch (error: any) {
        console.error("Error fetching tip:", error);
        if (error.message?.includes("Rate limit") || error.message?.includes("429")) {
          toast.error("Too many requests. Please try again in a moment.");
        } else if (error.message?.includes("Payment") || error.message?.includes("402")) {
          toast.error("AI service needs credits. Please contact support.");
        }
        setTip("Keep your ingredients at room temperature for best results!");
      } finally {
        setLoading(false);
      }
    };

    fetchTip();
  }, [context, premixName, stepTitle, difficulty]);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Smart Tip
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating tip...</span>
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{tip}</p>
        )}
      </CardContent>
    </Card>
  );
};
