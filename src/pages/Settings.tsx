import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Bell, Shield, Palette, Link2, Calendar, Target, Lock, Users, ChevronRight, FileText, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { UserRoleManager } from "@/components/UserRoleManager";
import { AuditLogsViewer } from "@/components/AuditLogsViewer";
import { CustomerMessagesManager } from "@/components/CustomerMessagesManager";

const Settings = () => {
  const { user, loading } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [showUserRoles, setShowUserRoles] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showCustomerMessages, setShowCustomerMessages] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const settingsCards = [
    {
      title: "App Settings",
      description: "Branding, app name, logo, and general configuration",
      icon: Palette,
      href: null,
      category: "general",
    },
    {
      title: "Integrations",
      description: "Connect with Shopify and other third-party services",
      icon: Link2,
      href: null,
      category: "general",
    },
    {
      title: "User Preferences",
      description: "Default date range, target margin, timezone settings",
      icon: Calendar,
      href: "/profile",
      category: "general",
    },
    {
      title: "Notifications",
      description: "Configure alert rules and notification preferences",
      icon: Bell,
      href: null,
      category: "general",
    },
    {
      title: "Security & Access",
      description: "Manage team roles, permissions, and security settings",
      icon: Lock,
      href: isAdmin ? "/admin" : null,
      category: "security",
    },
    {
      title: "Profile",
      description: "Manage your personal information and account details",
      icon: User,
      href: "/profile",
      category: "general",
    },
  ];

  const adminCards = [
    {
      title: "Admin Dashboard",
      description: "Security monitoring, audit logs, and system health",
      icon: Shield,
      href: "/admin",
    },
    {
      title: "User Role Management",
      description: "Manage user accounts and access permissions",
      icon: Users,
      onClick: () => { setShowUserRoles(!showUserRoles); setShowAuditLogs(false); setShowCustomerMessages(false); },
      isExpanded: showUserRoles,
    },
    {
      title: "Audit Logs",
      description: "Review security events and system activity",
      icon: FileText,
      onClick: () => { setShowAuditLogs(!showAuditLogs); setShowUserRoles(false); setShowCustomerMessages(false); },
      isExpanded: showAuditLogs,
    },
    {
      title: "Customer Messages",
      description: "View and respond to customer feedback and support requests",
      icon: MessageSquare,
      onClick: () => { setShowCustomerMessages(!showCustomerMessages); setShowUserRoles(false); setShowAuditLogs(false); },
      isExpanded: showCustomerMessages,
    },
    {
      title: "Performance Targets",
      description: "Set and monitor business KPIs and goals",
      icon: Target,
      href: null,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your account, preferences, and application settings
          </p>
        </div>

        {/* General Settings */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-4">General Settings</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {settingsCards.map((card) => (
              <Card 
                key={card.title} 
                className={`group transition-all ${card.href ? 'cursor-pointer hover:bg-muted/50 hover:shadow-md' : 'opacity-75'}`}
                onClick={() => card.href && navigate(card.href)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <card.icon className="h-5 w-5 text-primary" />
                    </div>
                    {card.href && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardTitle className="text-base mb-1">{card.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {card.description}
                  </CardDescription>
                  {!card.href && (
                    <p className="text-xs text-muted-foreground mt-2">Coming soon</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Administration (Admin Only) */}
        {isAdmin && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4">Administration</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {adminCards.map((card) => (
                <Card 
                  key={card.title} 
                  className={`group transition-all border-destructive/20 ${(card.href || card.onClick) ? 'cursor-pointer hover:bg-destructive/5 hover:shadow-md' : 'opacity-75'}`}
                  onClick={() => {
                    if (card.onClick) card.onClick();
                    else if (card.href) navigate(card.href);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <card.icon className="h-5 w-5 text-destructive" />
                      </div>
                      {(card.href || card.onClick) && (
                        <ChevronRight className={`h-4 w-4 text-muted-foreground group-hover:text-foreground transition-all ${card.isExpanded ? 'rotate-90' : ''}`} />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardTitle className="text-base mb-1">{card.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {card.description}
                    </CardDescription>
                    {!card.href && !card.onClick && (
                      <p className="text-xs text-muted-foreground mt-2">Coming soon</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* User Role Management Panel */}
            {showUserRoles && (
              <div className="mt-6">
                <UserRoleManager />
              </div>
            )}

            {/* Audit Logs Panel */}
            {showAuditLogs && (
              <div className="mt-6">
                <AuditLogsViewer />
              </div>
            )}

            {/* Customer Messages Panel */}
            {showCustomerMessages && (
              <div className="mt-6">
                <CustomerMessagesManager />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Settings;
