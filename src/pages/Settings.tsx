import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cog, User, Bell, Shield, Palette, Database, Key } from "lucide-react";
import { useAuth } from "@/lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";

const Settings = () => {
  const { user, loading } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const settingsItems = [
    {
      title: "Profile",
      description: "Manage your personal information and preferences",
      icon: User,
      href: "/profile",
    },
    {
      title: "Notifications",
      description: "Configure email and push notification settings",
      icon: Bell,
      href: null,
    },
    {
      title: "Appearance",
      description: "Customise the look and feel of your experience",
      icon: Palette,
      href: null,
    },
    {
      title: "Privacy & Security",
      description: "Manage your data and security settings",
      icon: Key,
      href: null,
    },
  ];

  const adminItems = [
    {
      title: "Admin Dashboard",
      description: "Access security monitoring and user management",
      icon: Shield,
      href: "/admin",
    },
    {
      title: "Database",
      description: "View and manage application data",
      icon: Database,
      href: null,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Account Settings</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {settingsItems.map((item) => (
                <Card 
                  key={item.title} 
                  className={`hover:shadow-lg transition-shadow ${item.href ? 'cursor-pointer' : 'opacity-75'}`}
                  onClick={() => item.href && navigate(item.href)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        {!item.href && (
                          <span className="text-xs text-muted-foreground">Coming soon</span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{item.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {isAdmin && (
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Administration</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {adminItems.map((item) => (
                  <Card 
                    key={item.title} 
                    className={`hover:shadow-lg transition-shadow ${item.href ? 'cursor-pointer' : 'opacity-75'}`}
                    onClick={() => item.href && navigate(item.href)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-destructive/10">
                          <item.icon className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                          {!item.href && (
                            <span className="text-xs text-muted-foreground">Coming soon</span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{item.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default Settings;
