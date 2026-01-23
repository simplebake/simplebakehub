import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ChefHat, Heart, Camera, Loader2 } from "lucide-react";

interface TopBaker {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  total_bakes: number;
  total_likes: number;
  score: number;
}

export function BakerOfTheWeek() {
  const [topBaker, setTopBaker] = useState<TopBaker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopBaker();
  }, []);

  const fetchTopBaker = async () => {
    try {
      // Get bakes from the last 7 days with their likes
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: bakes, error: bakesError } = await supabase
        .from("bake_shares")
        .select(`
          user_id,
          id,
          bake_likes(id)
        `)
        .eq("is_visible", true)
        .gte("created_at", oneWeekAgo.toISOString());

      if (bakesError) throw bakesError;

      if (!bakes || bakes.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate scores per user
      const userScores: Record<string, { bakes: number; likes: number }> = {};
      
      bakes.forEach(bake => {
        if (!userScores[bake.user_id]) {
          userScores[bake.user_id] = { bakes: 0, likes: 0 };
        }
        userScores[bake.user_id].bakes += 1;
        userScores[bake.user_id].likes += bake.bake_likes?.length || 0;
      });

      // Calculate weighted score (likes worth more than just posting)
      const scoredUsers = Object.entries(userScores).map(([userId, stats]) => ({
        userId,
        score: stats.bakes * 10 + stats.likes * 5, // 10 points per bake, 5 per like
        bakes: stats.bakes,
        likes: stats.likes,
      }));

      // Sort by score and get top user
      scoredUsers.sort((a, b) => b.score - a.score);
      const topUserId = scoredUsers[0]?.userId;

      if (!topUserId) {
        setLoading(false);
        return;
      }

      // Fetch profile of top baker using public_profiles view (excludes email)
      const { data: profile, error: profileError } = await supabase
        .from("public_profiles")
        .select("id, name, avatar_url, bio")
        .eq("id", topUserId)
        .single();

      if (profileError) throw profileError;

      setTopBaker({
        id: profile.id,
        name: profile.name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        total_bakes: scoredUsers[0].bakes,
        total_likes: scoredUsers[0].likes,
        score: scoredUsers[0].score,
      });
    } catch (error) {
      console.error("Error fetching top baker:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!topBaker) {
    return null; // Don't show if no bakes this week
  }

  return (
    <Card className="bg-primary/5 border-primary/20 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Trophy className="h-5 w-5 text-primary" />
          Baker of the Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Link to={`/baker/${topBaker.id}`}>
              <Avatar className="h-16 w-16 border-2 border-primary shadow-lg">
                <AvatarImage src={topBaker.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10">
                  <ChefHat className="h-8 w-8 text-primary" />
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
              <Trophy className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <Link 
              to={`/baker/${topBaker.id}`}
              className="font-semibold text-lg hover:text-primary transition-colors"
            >
              {topBaker.name}
            </Link>
            
            {topBaker.bio && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                {topBaker.bio}
              </p>
            )}
            
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="secondary">
                <Camera className="h-3 w-3 mr-1" />
                {topBaker.total_bakes} bakes
              </Badge>
              <Badge variant="outline">
                <Heart className="h-3 w-3 mr-1" />
                {topBaker.total_likes} likes
              </Badge>
            </div>
          </div>

          <Link to={`/baker/${topBaker.id}`}>
            <Button size="sm" variant="outline">
              View Profile
            </Button>
          </Link>
        </div>
        
        <p className="text-xs text-muted-foreground mt-4 text-center">
          🎉 Top contributor this week based on bakes shared and community engagement
        </p>
      </CardContent>
    </Card>
  );
}
