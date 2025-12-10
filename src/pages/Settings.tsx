import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Bell, Shield, Palette, Link2, Calendar, Target, Lock, Users, ChevronRight, FileText, MessageSquare, BookOpen } from "lucide-react";
import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { UserRoleManager } from "@/components/UserRoleManager";
import { AuditLogsViewer } from "@/components/AuditLogsViewer";
import { CustomerMessagesManager } from "@/components/CustomerMessagesManager";
import { RoleAccessGuide } from "@/components/RoleAccessGuide";

const Settings = () => {
  const { user, loading } = useAuth();
  const { isAdmin, isModerator, isStaff } = useUserRole();
  const navigate = useNavigate();
  const [showUserRoles, setShowUserRoles] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showCustomerMessages, setShowCustomerMessages] = useState(false);
  const [showRoleGuide, setShowRoleGuide] = useState(false);

  const closeAllPanels = () => {
    setShowUserRoles(false);
    setShowAuditLogs(false);
    setShowCustomerMessages(false);
    setShowRoleGuide(false);
  };

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

  // Admin-only cards
  const adminOnlyCards: Array<{
    title: string;
    description: string;
    icon: typeof Shield;
    href?: string | null;
    onClick?: () => void;
    isExpanded?: boolean;
  }> = [
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
      onClick: () => { closeAllPanels(); setShowUserRoles(true); },
      isExpanded: showUserRoles,
    },
    {
      title: "Audit Logs",
      description: "Review security events and system activity",
      icon: FileText,
      onClick: () => { closeAllPanels(); setShowAuditLogs(true); },
      isExpanded: showAuditLogs,
    },
    {
      title: "Role Access Guide",
      description: "View what each user role can access",
      icon: BookOpen,
      onClick: () => { closeAllPanels(); setShowRoleGuide(true); },
      isExpanded: showRoleGuide,
    },
    {
      title: "Performance Targets",
      description: "Set and monitor business KPIs and goals",
      icon: Target,
      href: null,
    },
  ];

  // Cards visible to both admin and moderator
  const staffCards: Array<{
    title: string;
    description: string;
    icon: typeof Shield;
    href?: string | null;
    onClick?: () => void;
    isExpanded?: boolean;
  }> = [
    {
      title: "Customer Messages",
      description: "View and respond to customer feedback and support requests",
      icon: MessageSquare,
      onClick: () => { closeAllPanels(); setShowCustomerMessages(true); },
      isExpanded: showCustomerMessages,
    },
  ];

  // Combine cards based on role
  const getAdminCards = () => {
    if (isAdmin) {
      return [...adminOnlyCards.slice(0, 3), ...staffCards, adminOnlyCards[3], adminOnlyCards[4]];
    }
    // Moderators only see customer messages
    return staffCards;
  };

  const adminCards = getAdminCards();

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

        {/* Administration (Staff - Admin & Moderator) */}
        {isStaff && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {isAdmin ? 'Administration' : 'Moderation'}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {adminCards.map((card) => (
                <Card 
                  key={card.title} 
                  className={`group transition-all ${isAdmin ? 'border-destructive/20' : 'border-blue-500/20'} ${(card.href || card.onClick) ? 'cursor-pointer hover:bg-destructive/5 hover:shadow-md' : 'opacity-75'}`}
                  onClick={() => {
                    if (card.onClick) card.onClick();
                    else if (card.href) navigate(card.href);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-lg ${isAdmin ? 'bg-destructive/10' : 'bg-blue-500/10'}`}>
                        <card.icon className={`h-5 w-5 ${isAdmin ? 'text-destructive' : 'text-blue-500'}`} />
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

            {/* User Role Management Panel (Admin only) */}
            {isAdmin && showUserRoles && (
              <div className="mt-6">
                <UserRoleManager />
              </div>
            )}

            {/* Audit Logs Panel (Admin only) */}
            {isAdmin && showAuditLogs && (
              <div className="mt-6">
                <AuditLogsViewer />
              </div>
            )}

            {/* Customer Messages Panel (Staff) */}
            {showCustomerMessages && (
              <div className="mt-6">
                <CustomerMessagesManager />
              </div>
            )}

            {/* Role Access Guide Panel (Admin only) */}
            {isAdmin && showRoleGuide && (
              <div className="mt-6">
                <RoleAccessGuide />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Settings;
