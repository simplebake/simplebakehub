import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export const SuccessRatingChart = () => {
  const { data: ratingData, isLoading } = useQuery({
    queryKey: ["success-ratings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("baking_sessions")
        .select("success_rating")
        .not("success_rating", "is", null);

      if (error) throw error;

      // Count ratings
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      (data || []).forEach((session) => {
        if (session.success_rating && counts[session.success_rating] !== undefined) {
          counts[session.success_rating]++;
        }
      });

      return [
        { rating: "1 Star", count: counts[1], fill: "hsl(var(--destructive))" },
        { rating: "2 Stars", count: counts[2], fill: "hsl(var(--chart-2))" },
        { rating: "3 Stars", count: counts[3], fill: "hsl(var(--chart-3))" },
        { rating: "4 Stars", count: counts[4], fill: "hsl(var(--chart-4))" },
        { rating: "5 Stars", count: counts[5], fill: "hsl(var(--primary))" },
      ];
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
        <CardTitle>Success Ratings Distribution</CardTitle>
        <CardDescription>How customers rate their baking outcomes</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ratingData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="rating" 
              className="text-xs fill-muted-foreground"
            />
            <YAxis className="text-xs fill-muted-foreground" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px"
              }}
            />
            <Bar dataKey="count" name="Bakes" radius={[4, 4, 0, 0]}>
              {ratingData?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
