import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

interface PerformanceGoal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  unit: string;
}

interface HistoryPoint {
  goal_id: string;
  recorded_value: number;
  recorded_at: string;
}

interface ChartData {
  date: string;
  [key: string]: string | number;
}

export const PerformanceGoalsTrends = () => {
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [dateRange, setDateRange] = useState<string>("30");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    if (selectedGoalId) {
      fetchHistory();
    }
  }, [selectedGoalId, dateRange]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_goals')
        .select('id, goal_name, goal_type, target_value, unit')
        .eq('is_active', true)
        .order('goal_name');

      if (error) throw error;
      setGoals(data || []);
      if (data && data.length > 0) {
        setSelectedGoalId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const daysAgo = subDays(new Date(), parseInt(dateRange));
      
      const { data, error } = await supabase
        .from('performance_goal_history')
        .select('goal_id, recorded_value, recorded_at')
        .eq('goal_id', selectedGoalId)
        .gte('recorded_at', daysAgo.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      setHistory(data || []);

      // Transform data for chart
      const selectedGoal = goals.find(g => g.id === selectedGoalId);
      const transformed: ChartData[] = (data || []).map(point => ({
        date: format(new Date(point.recorded_at), 'MMM dd'),
        value: Number(point.recorded_value),
        target: selectedGoal?.target_value || 0
      }));

      setChartData(transformed);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Goal Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No active goals to display trends for.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Goal Trends
            </CardTitle>
            <CardDescription>Track performance over time</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select goal" />
              </SelectTrigger>
              <SelectContent>
                {goals.map(goal => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.goal_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[120px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No historical data available yet.</p>
            <p className="text-sm mt-2">Data will be collected daily by the automated system.</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name={`${selectedGoal?.goal_name || 'Value'} (${selectedGoal?.unit || ''})`}
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  name="Target"
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
