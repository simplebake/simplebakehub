import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ChefHat, Loader2 } from "lucide-react";

interface Premix {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  image_url?: string;
}

interface RelatedPremixesProps {
  currentPremixId?: string;
  difficulty?: string;
  limit?: number;
}

export const RelatedPremixes = ({ currentPremixId, difficulty, limit = 3 }: RelatedPremixesProps) => {
  const [premixes, setPremixes] = useState<Premix[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRelatedPremixes = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from("premixes")
          .select("id, name, description, difficulty, image_url");

        // Exclude current premix if provided
        if (currentPremixId) {
          query = query.neq("id", currentPremixId);
        }

        // Filter by similar difficulty if provided
        if (difficulty) {
          query = query.eq("difficulty", difficulty);
        }

        const { data, error } = await query.limit(limit);

        if (error) throw error;
        setPremixes(data || []);
      } catch (error) {
        console.error("Error fetching related premixes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedPremixes();
  }, [currentPremixId, difficulty, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (premixes.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold">You Might Also Like</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {premixes.map((premix) => (
          <Card key={premix.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="aspect-video bg-secondary/20 rounded-md overflow-hidden mb-3">
                {premix.image_url ? (
                  <img 
                    src={premix.image_url} 
                    alt={premix.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ChefHat className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardTitle className="text-lg">{premix.name}</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {premix.description}
              </p>
              <Badge variant="secondary">{premix.difficulty}</Badge>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => navigate(`/guided-bake/${premix.id}`)}
                className="w-full"
                variant="outline"
              >
                Start Baking
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};
