import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, AlertTriangle, ArrowRight, Package, Camera, Sparkles, HelpCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { BakerOfTheWeek } from "@/components/BakerOfTheWeek";
import { FollowingFeed } from "@/components/FollowingFeed";
import { useContentVisibility } from "@/hooks/useContentVisibility";
import { useAuth } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const Index = () => {
  const { isContentVisible, loading: visibilityLoading } = useContentVisibility();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user's profile name
  const { data: profile } = useQuery({
    queryKey: ["profile-name", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user!.id)
        .single();
      return data;
    },
  });

  // Fetch latest feeding log for the current user
  const { data: latestFeeding } = useQuery({
    queryKey: ["latest-feeding", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("feeding_logs")
        .select("fed_at")
        .eq("user_id", user!.id)
        .order("fed_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  // Fetch today's community bake count
  const { data: todayBakeCount } = useQuery({
    queryKey: ["today-bakes"],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("bake_shares")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString())
        .eq("is_visible", true);
      return count ?? 0;
    },
  });

  // Fetch user's latest bake rating
  const { data: latestBake } = useQuery({
    queryKey: ["latest-bake-rating", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("baking_sessions")
        .select("success_rating, completed_at")
        .eq("user_id", user!.id)
        .not("success_rating", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  const alerts = useMemo(() => {
    const items: { type: string; message: string; time: string; path?: string }[] = [];

    // Starter feeding alert
    if (user && latestFeeding) {
      const fedAt = new Date(latestFeeding.fed_at);
      const daysSinceFed = Math.floor((Date.now() - fedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceFed >= 3) {
        items.push({
          type: "warning",
          message: `Your starter hasn't been fed in ${daysSinceFed} days — time for a refresh!`,
          time: formatDistanceToNow(fedAt, { addSuffix: true }),
          path: "/feeding-log",
        });
      }
    } else if (user && latestFeeding === null) {
      items.push({
        type: "info",
        message: "Start tracking your starter feedings to get personalised reminders!",
        time: "Tip",
        path: "/feeding-log",
      });
    }

    // Community bakes alert
    if (todayBakeCount !== undefined && todayBakeCount > 0) {
      items.push({
        type: "info",
        message: `${todayBakeCount} new community bake${todayBakeCount === 1 ? "" : "s"} shared today — check them out`,
        time: "Today",
        path: "/share-bake",
      });
    }

    // Latest bake rating
    if (latestBake?.success_rating) {
      const time = latestBake.completed_at
        ? formatDistanceToNow(new Date(latestBake.completed_at), { addSuffix: true })
        : "Recently";
      items.push({
        type: "success",
        message: `Your last bake scored ${latestBake.success_rating}★ — nice work!`,
        time,
        path: "/dashboard",
      });
    }

    // Fallback if no dynamic alerts
    if (items.length === 0) {
      items.push({ type: "info", message: "All caught up — happy baking! 🎉", time: "Now" });
    }

    return items;
  }, [user, latestFeeding, todayBakeCount, latestBake]);


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
            <h1 className="text-3xl font-semibold text-foreground">
              {profile?.name ? `Hey ${profile.name.split(' ')[0]} 👋` : 'Home / Overview'}
            </h1>
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
                  className={`flex items-start gap-3 p-3 rounded-lg bg-muted/50 ${alert.path ? 'cursor-pointer hover:bg-muted transition-colors' : ''}`}
                  onClick={() => alert.path && navigate(alert.path)}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    alert.type === 'warning' ? 'bg-warning' : 
                    alert.type === 'success' ? 'bg-success' : 'bg-primary'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.time}</p>
                  </div>
                  {alert.path && <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>


        {/* Baker of the Week & Following Feed */}
        {user && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <BakerOfTheWeek />
            <FollowingFeed />
          </div>
        )}


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
