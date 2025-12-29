import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { toast } from "sonner";
import { Target, Plus, Trash2, Loader2, Edit2, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface PerformanceGoal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  unit: string;
  period: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

const goalTypes = [
  { value: "revenue", label: "Revenue" },
  { value: "orders", label: "Orders" },
  { value: "customers", label: "New Customers" },
  { value: "bakes", label: "Bakes Completed" },
  { value: "rating", label: "Average Rating" },
  { value: "custom", label: "Custom Goal" },
];

const periods = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export const PerformanceGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PerformanceGoal | null>(null);
  
  const [formData, setFormData] = useState({
    goal_name: "",
    goal_type: "revenue",
    target_value: "",
    current_value: "",
    unit: "",
    period: "monthly",
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("performance_goals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals((data as PerformanceGoal[]) || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast.error("Failed to load performance goals");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      goal_name: "",
      goal_type: "revenue",
      target_value: "",
      current_value: "",
      unit: "",
      period: "monthly",
    });
    setEditingGoal(null);
  };

  const openEditDialog = (goal: PerformanceGoal) => {
    setEditingGoal(goal);
    setFormData({
      goal_name: goal.goal_name,
      goal_type: goal.goal_type,
      target_value: goal.target_value.toString(),
      current_value: goal.current_value.toString(),
      unit: goal.unit,
      period: goal.period,
    });
    setDialogOpen(true);
  };

  const saveGoal = async () => {
    if (!formData.goal_name.trim() || !formData.target_value) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const goalData = {
        goal_name: formData.goal_name.trim(),
        goal_type: formData.goal_type,
        target_value: parseFloat(formData.target_value),
        current_value: parseFloat(formData.current_value) || 0,
        unit: formData.unit,
        period: formData.period,
        created_by: user?.id,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from("performance_goals")
          .update(goalData)
          .eq("id", editingGoal.id);

        if (error) throw error;
        toast.success("Goal updated successfully");
      } else {
        const { error } = await supabase
          .from("performance_goals")
          .insert(goalData);

        if (error) throw error;
        toast.success("Goal created successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchGoals();
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from("performance_goals")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Goal deleted");
      fetchGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Failed to delete goal");
    }
  };

  const toggleGoalStatus = async (goal: PerformanceGoal) => {
    try {
      const { error } = await supabase
        .from("performance_goals")
        .update({ is_active: !goal.is_active })
        .eq("id", goal.id);

      if (error) throw error;
      toast.success(goal.is_active ? "Goal paused" : "Goal activated");
      fetchGoals();
    } catch (error) {
      console.error("Error updating goal:", error);
      toast.error("Failed to update goal");
    }
  };

  const getProgress = (goal: PerformanceGoal) => {
    if (goal.target_value === 0) return 0;
    return Math.min(100, (goal.current_value / goal.target_value) * 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-green-500";
    if (progress >= 75) return "bg-primary";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-orange-500";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Performance Goals</CardTitle>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
                <DialogDescription>
                  Set a performance target to track your progress
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="goal_name">Goal Name *</Label>
                  <Input
                    id="goal_name"
                    value={formData.goal_name}
                    onChange={(e) => setFormData({ ...formData, goal_name: e.target.value })}
                    placeholder="e.g., Monthly Revenue Target"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="goal_type">Goal Type</Label>
                    <Select
                      value={formData.goal_type}
                      onValueChange={(value) => setFormData({ ...formData, goal_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {goalTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="period">Period</Label>
                    <Select
                      value={formData.period}
                      onValueChange={(value) => setFormData({ ...formData, period: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {periods.map((period) => (
                          <SelectItem key={period.value} value={period.value}>
                            {period.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="target_value">Target *</Label>
                    <Input
                      id="target_value"
                      type="number"
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                      placeholder="1000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_value">Current</Label>
                    <Input
                      id="current_value"
                      type="number"
                      value={formData.current_value}
                      onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="$, %, etc."
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveGoal} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingGoal ? "Update Goal" : "Create Goal"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Set and track business KPIs and performance targets
        </CardDescription>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No performance goals yet</p>
            <p className="text-sm">Create your first goal to start tracking progress</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = getProgress(goal);
              const isAchieved = progress >= 100;
              
              return (
                <div
                  key={goal.id}
                  className={`p-4 rounded-lg border ${goal.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{goal.goal_name}</h4>
                        {isAchieved && (
                          <Badge variant="default" className="bg-green-500">
                            Achieved!
                          </Badge>
                        )}
                        {!goal.is_active && (
                          <Badge variant="secondary">Paused</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="capitalize">
                          {goal.goal_type}
                        </Badge>
                        <span>•</span>
                        <span className="capitalize">{goal.period}</span>
                        <span>•</span>
                        <span>Started {format(new Date(goal.start_date), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleGoalStatus(goal)}
                        title={goal.is_active ? "Pause goal" : "Activate goal"}
                      >
                        {goal.is_active ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(goal)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteGoal(goal.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {goal.current_value.toLocaleString()}{goal.unit} of {goal.target_value.toLocaleString()}{goal.unit}
                      </span>
                      <span className="font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
