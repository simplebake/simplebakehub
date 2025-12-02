import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Insight {
  stat: string;
  condition: string;
  action: string;
  icon: string;
}

interface CommunityInsightsProps {
  premixId?: string;
  context?: string;
  className?: string;
}

export function CommunityInsights({ premixId, context, className }: CommunityInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSessions, setTotalSessions] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchInsights();
  }, [premixId, context]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-community-insights', {
        body: { premixId, context }
      });

      if (error) throw error;

      setInsights(data.insights || []);
      setTotalSessions(data.totalSessions || 0);
      setMessage(data.message || "");
    } catch (error) {
      console.error('Error fetching community insights:', error);
      setMessage("Unable to load insights right now.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (message || insights.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Community Wisdom
          </CardTitle>
          <CardDescription>{message || "No insights available yet."}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Community Wisdom
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {totalSessions} bakers
          </Badge>
        </div>
        <CardDescription>
          Insights from thousands of successful bakes in our community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/20 transition-colors"
          >
            <div className="text-2xl flex-shrink-0">{insight.icon}</div>
            <div className="flex-1 space-y-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-bold text-primary">{insight.stat}</span>
                <span className="text-sm text-muted-foreground">{insight.condition}</span>
              </div>
              <p className="text-sm leading-relaxed">{insight.action}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
