import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface FeedingEntry {
  id: string;
  date: string;
  time: string;
  flourAmount: number;
  waterAmount: number;
  temperature: number;
  notes: string;
}

interface FeedingChartProps {
  entries: FeedingEntry[];
}

const FeedingChart = ({ entries }: FeedingChartProps) => {
  const chartData = useMemo(() => {
    const sorted = [...entries].reverse();
    return sorted.map((e, i) => {
      const dt = new Date(`${e.date}T${e.time}`);
      let hoursSinceLast: number | null = null;
      if (i > 0) {
        const prev = sorted[i - 1];
        const prevDt = new Date(`${prev.date}T${prev.time}`);
        hoursSinceLast = Math.round(((dt.getTime() - prevDt.getTime()) / 3600000) * 10) / 10;
      }
      return {
        label: dt.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        temp: e.temperature,
        flour: e.flourAmount,
        water: e.waterAmount,
        interval: hoursSinceLast,
      };
    });
  }, [entries]);

  if (chartData.length < 2) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Log at least 2 feedings to see trends.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="font-bold text-base text-foreground">Trends</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <YAxis
              yAxisId="temp"
              orientation="right"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              domain={["dataMin - 5", "dataMax + 5"]}
              label={{ value: "°C", position: "top", offset: -2, fontSize: 10 }}
            />
            <YAxis
              yAxisId="amount"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              label={{ value: "g", position: "top", offset: -2, fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar
              yAxisId="amount"
              dataKey="flour"
              name="Flour (g)"
              fill="hsl(var(--primary) / 0.5)"
              radius={[3, 3, 0, 0]}
              barSize={14}
            />
            <Bar
              yAxisId="amount"
              dataKey="water"
              name="Water (g)"
              fill="hsl(var(--info) / 0.5)"
              radius={[3, 3, 0, 0]}
              barSize={14}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temp"
              name="Temp (°C)"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--accent))" }}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="interval"
              name="Hours between"
              stroke="hsl(var(--secondary))"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ r: 3, fill: "hsl(var(--secondary))" }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FeedingChart;
