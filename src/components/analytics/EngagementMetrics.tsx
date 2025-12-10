import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, Heart, MessageCircle, Users, TrendingUp, Award } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  trend?: number;
}

const MetricCard = ({ title, value, description, icon, trend }: MetricCardProps) => (
  <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
    <div className="p-3 rounded-lg bg-primary/10">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    {trend !== undefined && (
      <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-500' : 'text-destructive'}`}>
        <TrendingUp className={`h-4 w-4 ${trend < 0 ? 'rotate-180' : ''}`} />
        {Math.abs(trend)}%
      </div>
    )}
  </div>
);

export const EngagementMetrics = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["engagement-metrics"],
    queryFn: async () => {
      // Fetch all metrics in parallel
      const [sharesResult, likesResult, commentsResult, sessionsResult, achievementsResult] = await Promise.all([
        supabase.from("bake_shares").select("id", { count: "exact", head: true }),
        supabase.from("bake_likes").select("id", { count: "exact", head: true }),
        supabase.from("bake_comments").select("id", { count: "exact", head: true }),
        supabase.from("baking_sessions").select("id", { count: "exact", head: true }),
        supabase.from("user_achievements").select("id", { count: "exact", head: true }),
      ]);

      // Get unique users count
      const { data: uniqueUsers } = await supabase
        .from("baking_sessions")
        .select("user_id");
      
      const uniqueUserIds = new Set((uniqueUsers || []).map(u => u.user_id));

      return {
        shares: sharesResult.count || 0,
        likes: likesResult.count || 0,
        comments: commentsResult.count || 0,
        sessions: sessionsResult.count || 0,
        achievements: achievementsResult.count || 0,
        activeUsers: uniqueUserIds.size,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Metrics</CardTitle>
        <CardDescription>Community activity and user engagement</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Active Bakers"
            value={metrics?.activeUsers || 0}
            description="Unique users with baking sessions"
            icon={<Users className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            title="Total Baking Sessions"
            value={metrics?.sessions || 0}
            description="Completed baking sessions"
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            title="Bake Shares"
            value={metrics?.shares || 0}
            description="Bakes shared with community"
            icon={<Share2 className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            title="Total Likes"
            value={metrics?.likes || 0}
            description="Likes on shared bakes"
            icon={<Heart className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            title="Comments"
            value={metrics?.comments || 0}
            description="Comments on shared bakes"
            icon={<MessageCircle className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            title="Achievements Earned"
            value={metrics?.achievements || 0}
            description="Badges earned by users"
            icon={<Award className="h-5 w-5 text-primary" />}
          />
        </div>
      </CardContent>
    </Card>
  );
};
