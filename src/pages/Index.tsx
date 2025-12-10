import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChefHat, Plus, ShoppingCart, DollarSign, Percent, AlertTriangle, Megaphone, Users, ArrowRight, Clock, TrendingDown, Package } from "lucide-react";
import { useAuth } from "@/lib/supabase";
import { Header } from "@/components/Header";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Show landing page for non-authenticated users
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 max-w-6xl">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <ChefHat className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
              Simple Bake Lab
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Your journey to perfect gluten-free bread starts here
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8 py-6">
                Get Started
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/shop")} className="text-lg px-8 py-6">
                Browse Shop
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Placeholder data - wire to real backend
  const metrics = [
    { label: "Today's Orders", value: "12", icon: ShoppingCart, trend: "+3 from yesterday" },
    { label: "Today's Revenue", value: "£284", icon: DollarSign, trend: "+18% vs avg" },
    { label: "Avg Margin", value: "42%", icon: Percent, trend: "On target" },
    { label: "Open Issues", value: "2", icon: AlertTriangle, trend: "1 urgent" },
  ];

  const alerts = [
    { type: "warning", message: "Flour price increased 8% - review margins", time: "2h ago" },
    { type: "info", message: "3 orders pending dispatch", time: "4h ago" },
    { type: "success", message: "New customer signup from Cambridge", time: "6h ago" },
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
    { label: "Marketing & Customers", path: "/marketing", icon: Megaphone },
    { label: "View Premixes", path: "/premixes", icon: Package },
    { label: "Customer Analytics", path: "/marketing", icon: Users },
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

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((metric) => (
            <Card key={metric.label} className="bg-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                    <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{metric.trend}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <metric.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
