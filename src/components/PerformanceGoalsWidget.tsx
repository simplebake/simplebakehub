import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface PerformanceGoal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  current_value: number | null;
  unit: string;
  period: string;
  is_active: boolean;
}

export const PerformanceGoalsWidget = () => {
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    if (isAdmin) {
      fetchTopGoals();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchTopGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_goals')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching performance goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (goal: PerformanceGoal) => {
    if (!goal.current_value || goal.target_value === 0) return 0;
    return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
  };

  const getTrendIcon = (goal: PerformanceGoal) => {
    const progress = getProgress(goal);
    if (progress >= 75) return <TrendingUp className="h-4 w-4 text-success" />;
    if (progress >= 50) return <Minus className="h-4 w-4 text-warning" />;
    return <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  const getStatusColor = (goal: PerformanceGoal) => {
    const progress = getProgress(goal);
    if (progress >= 100) return "bg-success";
    if (progress >= 75) return "bg-success/80";
    if (progress >= 50) return "bg-warning";
    return "bg-destructive/80";
  };

  // Only show widget for admins
  if (!isAdmin) return null;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Performance Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Performance Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No active goals. Set up goals in Settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Performance Goals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = getProgress(goal);
            return (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(goal)}
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {goal.goal_name}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {goal.current_value ?? 0} / {goal.target_value} {goal.unit}
                  </Badge>
                </div>
                <div className="relative">
                  <Progress value={progress} className="h-2" />
                  <div 
                    className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getStatusColor(goal)}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{goal.period}</span>
                  <span>{progress}% complete</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
