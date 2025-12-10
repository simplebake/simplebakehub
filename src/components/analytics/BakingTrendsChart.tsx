import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfDay } from "date-fns";

export const BakingTrendsChart = () => {
  const { data: trendData, isLoading } = useQuery({
    queryKey: ["baking-trends"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const { data, error } = await supabase
        .from("baking_sessions")
        .select("created_at, success_rating")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by day
      const grouped = (data || []).reduce((acc: Record<string, { count: number; totalRating: number; ratingCount: number }>, session) => {
        const day = format(new Date(session.created_at), "MMM dd");
        if (!acc[day]) {
          acc[day] = { count: 0, totalRating: 0, ratingCount: 0 };
        }
        acc[day].count++;
        if (session.success_rating) {
          acc[day].totalRating += session.success_rating;
          acc[day].ratingCount++;
        }
        return acc;
      }, {});

      // Create array with all days in range
      const result = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const day = format(date, "MMM dd");
        const dayData = grouped[day] || { count: 0, totalRating: 0, ratingCount: 0 };
        result.push({
          day,
          sessions: dayData.count,
          avgRating: dayData.ratingCount > 0 ? Math.round((dayData.totalRating / dayData.ratingCount) * 10) / 10 : null,
        });
      }

      return result;
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
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Baking Sessions Trend</CardTitle>
        <CardDescription>Daily baking sessions over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="day" 
              className="text-xs fill-muted-foreground"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis className="text-xs fill-muted-foreground" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px"
              }}
            />
            <Line 
              type="monotone" 
              dataKey="sessions" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={false}
              name="Sessions"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
