import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Star, Calendar } from "lucide-react";
import { format } from "date-fns";

interface BakingHistorySectionProps {
  userId: string;
}

interface BakeShare {
  id: string;
  created_at: string;
  rating: number | null;
  image_url: string;
  description: string | null;
  premixes: {
    id: string;
    name: string;
    difficulty: string;
  };
}

export const BakingHistorySection = ({ userId }: BakingHistorySectionProps) => {
  const [loading, setLoading] = useState(true);
  const [bakes, setBakes] = useState<BakeShare[]>([]);
  const [stats, setStats] = useState({
    totalBakes: 0,
    averageRating: 0,
    difficultiesCompleted: [] as string[],
  });

  useEffect(() => {
    fetchBakingHistory();
  }, [userId]);

  const fetchBakingHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("bake_shares")
        .select(`
          id,
          created_at,
          rating,
          image_url,
          description,
          premixes (
            id,
            name,
            difficulty
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setBakes(data as any);
        
        // Calculate statistics
        const totalBakes = data.length;
        const ratingsSum = data.reduce((sum, bake) => sum + (bake.rating || 0), 0);
        const ratedBakes = data.filter(bake => bake.rating).length;
        const averageRating = ratedBakes > 0 ? ratingsSum / ratedBakes : 0;
        
        const difficultiesSet = new Set(
          data.map(bake => bake.premixes?.difficulty).filter(Boolean)
        );
        
        setStats({
          totalBakes,
          averageRating: Math.round(averageRating * 10) / 10,
          difficultiesCompleted: Array.from(difficultiesSet) as string[],
        });
      }
    } catch (error) {
      console.error("Error fetching baking history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Bakes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.totalBakes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Average Rating
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Difficulties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {stats.difficultiesCompleted.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.difficultiesCompleted.join(", ") || "None yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Baking History */}
      <Card>
        <CardHeader>
          <CardTitle>Baking History</CardTitle>
          <CardDescription>
            Your complete baking journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bakes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No bakes yet. Start your baking journey today!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bakes.map((bake) => (
                <div
                  key={bake.id}
                  className="flex gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  <img
                    src={bake.image_url}
                    alt={bake.premixes?.name}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                  <div className="flex-1 space-y-2">
                    <div>
                      <h3 className="font-semibold">{bake.premixes?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(bake.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    {bake.description && (
                      <p className="text-sm">{bake.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                        {bake.premixes?.difficulty}
                      </span>
                      {bake.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-primary text-primary" />
                          <span>{bake.rating}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
