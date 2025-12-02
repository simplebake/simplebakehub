import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, ChefHat } from "lucide-react";
import { useAuth } from "@/lib/supabase";
import { toast } from "sonner";

interface Recommendation {
  premixName: string;
  premixId: string;
  difficulty: string;
  description: string;
  reason: string;
  highlight: string;
}

interface PersonalizedRecommendationsProps {
  limit?: number;
}

export const PersonalizedRecommendations = ({ limit = 3 }: PersonalizedRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasHistory, setHasHistory] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchRecommendations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('personalized-recommendations', {
        body: {}
      });

      if (error) {
        console.error('Error fetching recommendations:', error);
        toast.error('Failed to load personalized recommendations');
        return;
      }

      setRecommendations(data.recommendations.slice(0, limit));
      setHasHistory(data.hasHistory);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">
            {hasHistory ? 'Recommended For You' : 'Start Your Baking Journey'}
          </h2>
          <p className="text-muted-foreground">
            {hasHistory 
              ? 'Based on your baking history and preferences' 
              : 'Popular premixes perfect for beginners'}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((rec, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full" />
            
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="h-12 w-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <ChefHat className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="secondary" className="mt-1">
                  {rec.difficulty}
                </Badge>
              </div>
              <CardTitle className="text-xl">{rec.premixName}</CardTitle>
              <CardDescription className="line-clamp-2">
                {rec.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Why this premix?
                </p>
                <p className="text-sm text-muted-foreground">
                  {rec.reason}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-primary">
                  ✨ Special Feature
                </p>
                <p className="text-sm text-muted-foreground">
                  {rec.highlight}
                </p>
              </div>

              <Button 
                onClick={() => navigate(`/guided-bake/${rec.premixId}`)}
                className="w-full"
              >
                Start Baking
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasHistory && (
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/premixes')}
            className="gap-2"
          >
            Explore All Premixes
          </Button>
        </div>
      )}
    </div>
  );
};