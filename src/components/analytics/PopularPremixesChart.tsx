import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const PopularPremixesChart = () => {
  const { data: premixData, isLoading } = useQuery({
    queryKey: ["popular-premixes"],
    queryFn: async () => {
      // Get baking sessions with premix info
      const { data: sessions, error: sessionsError } = await supabase
        .from("baking_sessions")
        .select("premix_id");

      if (sessionsError) throw sessionsError;

      // Count by premix
      const counts: Record<string, number> = {};
      (sessions || []).forEach((session) => {
        counts[session.premix_id] = (counts[session.premix_id] || 0) + 1;
      });

      // Get premix names
      const premixIds = Object.keys(counts);
      if (premixIds.length === 0) return [];

      const { data: premixes, error: premixError } = await supabase
        .from("premixes")
        .select("id, name")
        .in("id", premixIds);

      if (premixError) throw premixError;

      // Combine and sort
      const result = (premixes || [])
        .map((premix) => ({
          name: premix.name,
          value: counts[premix.id] || 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

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

  const hasData = premixData && premixData.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Popular Premixes</CardTitle>
        <CardDescription>Top 5 premixes by baking sessions</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={premixData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {premixData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No baking session data available yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};
