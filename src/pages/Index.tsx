import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ShoppingCart, DollarSign, Percent, AlertTriangle, Megaphone, Users, ArrowRight, Clock, Package, Camera, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { PerformanceGoalsWidget } from "@/components/PerformanceGoalsWidget";
import { BakerOfTheWeek } from "@/components/BakerOfTheWeek";
import { FollowingFeed } from "@/components/FollowingFeed";
import { useContentVisibility } from "@/hooks/useContentVisibility";
import { useAuth } from "@/lib/supabase";

const Index = () => {
  const { isContentVisible, loading: visibilityLoading } = useContentVisibility();
  const { user } = useAuth();
  const navigate = useNavigate();


  const alerts = [
    { type: "warning", message: "Rice flour stock running low — reorder by Friday", time: "1h ago" },
    { type: "info", message: "2 new community bakes awaiting moderation", time: "3h ago" },
    { type: "success", message: "Sourdough Starter Kit back in stock", time: "5h ago" },
  ];

  const todaysFocus = [
    { id: "1", task: "Review low-margin products", done: false },
    { id: "2", task: "Respond to customer feedback", done: false },
    { id: "3", task: "Update seasonal promotion", done: true },
    { id: "4", task: "Check inventory levels", done: false },
  ];

  const recentActivity = [
    { action: "Order #1847 shipped", time: "10 min ago" },
    { action: "New review: Sourdough Mix ★★★★★", time: "1h ago" },
    { action: "Promotion 'AUTUMN15' activated", time: "3h ago" },
    { action: "Inventory restocked: Bread Mix", time: "Yesterday" },
  ];

  const shortcuts = [
    { label: "View Premixes", path: "/premixes", icon: Package },
    { label: "Bake Photo Analysis", path: "/bake-analysis", icon: Camera },
    { label: "Recipe Generator", path: "/recipe-generator", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Home / Overview</h1>
            <p className="text-muted-foreground mt-1">
              Your daily snapshot and quick actions
            </p>
          </div>
          <Button onClick={() => navigate("/premixes")} className="gap-2">
            <Plus className="h-4 w-4" />
            Add new premix
          </Button>
        </div>

        {/* Alerts & Issues */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alerts & Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    alert.type === 'warning' ? 'bg-warning' : 
                    alert.type === 'success' ? 'bg-success' : 'bg-primary'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Two Column Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Today's Focus */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Today's Focus</CardTitle>
              <CardDescription>Your priority tasks for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaysFocus.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <Checkbox id={item.id} checked={item.done} />
                    <label 
                      htmlFor={item.id} 
                      className={`text-sm cursor-pointer ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                    >
                      {item.task}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest updates across your business</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">{item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Baker of the Week & Following Feed */}
        {user && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <BakerOfTheWeek />
            <FollowingFeed />
          </div>
        )}

        {/* Performance Goals Widget - Admin Only */}
        <div className="mb-8">
          <PerformanceGoalsWidget />
        </div>

        {/* Shortcuts */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Shortcuts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {shortcuts.map((shortcut) => (
              <Card 
                key={shortcut.label} 
                className="cursor-pointer hover:bg-muted/50 transition-colors group"
                onClick={() => navigate(shortcut.path)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <shortcut.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{shortcut.label}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
