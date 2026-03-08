import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";

interface FeedingDataPoint {
  fed_at: string;
  rise_percentage?: number | null;
  peak_hours?: number | null;
  temperature_celsius?: number | null;
}

interface FeedingChartProps {
  data: FeedingDataPoint[];
}

const chartConfig = {
  rise: { label: "Rise %", color: "hsl(var(--primary))" },
  peak: { label: "Peak Hours", color: "hsl(var(--accent))" },
  temp: { label: "Temp °C", color: "hsl(var(--success))" },
};

export const FeedingChart = ({ data }: FeedingChartProps) => {
  if (!data.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Log some feedings to see your starter trends here.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data
    .slice(-20)
    .map((d) => ({
      date: format(new Date(d.fed_at), "dd MMM"),
      rise: d.rise_percentage ?? undefined,
      peak: d.peak_hours ?? undefined,
      temp: d.temperature_celsius ?? undefined,
    }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Starter Activity Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="rise" stroke="var(--color-rise)" strokeWidth={2} dot={{ r: 3 }} name="Rise %" />
            <Line type="monotone" dataKey="peak" stroke="var(--color-peak)" strokeWidth={2} dot={{ r: 3 }} name="Peak Hours" />
            <Line type="monotone" dataKey="temp" stroke="var(--color-temp)" strokeWidth={2} dot={{ r: 3 }} name="Temp °C" />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
