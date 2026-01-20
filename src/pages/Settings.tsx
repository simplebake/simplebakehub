import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Bell, Shield, Palette, Link2, Calendar, Target, Lock, Users, ChevronRight, FileText, MessageSquare, BookOpen, GraduationCap, Flag, Key, Eye } from "lucide-react";
import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { UserRoleManager } from "@/components/UserRoleManager";
import { AuditLogsViewer } from "@/components/AuditLogsViewer";
import { CustomerMessagesManager } from "@/components/CustomerMessagesManager";
import { RoleAccessGuide } from "@/components/RoleAccessGuide";
import { TutorialsManager } from "@/components/TutorialsManager";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { UserNotificationPreferences } from "@/components/UserNotificationPreferences";
import { ContentReportsManager } from "@/components/ContentReportsManager";
import { IntegrationsSettings } from "@/components/IntegrationsSettings";
import { AppSettings } from "@/components/AppSettings";
import { PerformanceGoals } from "@/components/PerformanceGoals";
import { PermissionsManager } from "@/components/PermissionsManager";
import { ContentVisibilityManager } from "@/components/ContentVisibilityManager";

const Settings = () => {
  const { user, loading } = useAuth();
  const { isAdmin, isModerator, isSupport, isStaff } = useUserRole();
  const navigate = useNavigate();
  const [showUserRoles, setShowUserRoles] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showCustomerMessages, setShowCustomerMessages] = useState(false);
  const [showRoleGuide, setShowRoleGuide] = useState(false);
  const [showTutorials, setShowTutorials] = useState(false);
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
  const [showContentReports, setShowContentReports] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [showPerformanceGoals, setShowPerformanceGoals] = useState(false);
  const [showUserNotificationPrefs, setShowUserNotificationPrefs] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showVisibility, setShowVisibility] = useState(false);

  const closeAllPanels = () => {
    setShowUserRoles(false);
    setShowAuditLogs(false);
    setShowCustomerMessages(false);
    setShowRoleGuide(false);
    setShowTutorials(false);
    setShowNotificationPrefs(false);
    setShowContentReports(false);
    setShowIntegrations(false);
    setShowAppSettings(false);
    setShowPerformanceGoals(false);
    setShowUserNotificationPrefs(false);
    setShowPermissions(false);
    setShowVisibility(false);
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

  const settingsCards: Array<{
    title: string;
    description: string;
    icon: typeof User;
    href?: string | null;
    onClick?: () => void;
    isExpanded?: boolean;
    category: string;
  }> = [
    {
      title: "App Settings",
      description: "Branding, app name, logo, and general configuration",
      icon: Palette,
      href: null,
      onClick: isAdmin ? () => { closeAllPanels(); setShowAppSettings(true); } : undefined,
      isExpanded: showAppSettings,
      category: "general",
    },
    {
      title: "Integrations",
      description: "Connect with Shopify and other third-party services",
      icon: Link2,
      href: null,
      onClick: () => { closeAllPanels(); setShowIntegrations(true); },
      isExpanded: showIntegrations,
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
      onClick: () => { closeAllPanels(); setShowUserNotificationPrefs(true); },
      isExpanded: showUserNotificationPrefs,
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
      title: "Permissions Manager",
      description: "Configure granular permissions for roles and users",
      icon: Key,
      onClick: () => { closeAllPanels(); setShowPermissions(true); },
      isExpanded: showPermissions,
    },
    {
      title: "Content Visibility",
      description: "Control which content users can view and access",
      icon: Eye,
      onClick: () => { closeAllPanels(); setShowVisibility(true); },
      isExpanded: showVisibility,
    },
    {
      title: "Performance Targets",
      description: "Set and monitor business KPIs and goals",
      icon: Target,
      onClick: () => { closeAllPanels(); setShowPerformanceGoals(true); },
      isExpanded: showPerformanceGoals,
    },
  ];

  // Cards visible to admin and moderator
  const moderatorCards: Array<{
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
    {
      title: "Content Reports",
      description: "Review and moderate reported community content",
      icon: Flag,
      onClick: () => { closeAllPanels(); setShowContentReports(true); },
      isExpanded: showContentReports,
    },
  ];

  // Cards visible to support role
  const supportCards: Array<{
    title: string;
    description: string;
    icon: typeof Shield;
    href?: string | null;
    onClick?: () => void;
    isExpanded?: boolean;
  }> = [
    {
      title: "Tutorials Management",
      description: "Create and manage tutorial content",
      icon: GraduationCap,
      onClick: () => { closeAllPanels(); setShowTutorials(true); },
      isExpanded: showTutorials,
    },
  ];

  // Notification preferences card for all staff
  const notificationCard = {
    title: "Notification Preferences",
    description: "Choose which email alerts you receive",
    icon: Bell,
    href: null as string | null,
    onClick: () => { closeAllPanels(); setShowNotificationPrefs(true); },
    isExpanded: showNotificationPrefs,
  };

  // Combine cards based on role
  const getAdminCards = () => {
    if (isAdmin) {
      return [...adminOnlyCards.slice(0, 3), ...moderatorCards, adminOnlyCards[3], adminOnlyCards[4], adminOnlyCards[5], adminOnlyCards[6], ...supportCards, notificationCard];
    }
    if (isModerator) {
      return [...moderatorCards, notificationCard];
    }
    if (isSupport) {
      return [...supportCards, notificationCard];
    }
    return [];
  };

  const adminCards = getAdminCards();

  const getSectionTitle = () => {
    if (isAdmin) return 'Administration';
    if (isModerator) return 'Moderation';
    if (isSupport) return 'Content Management';
    return '';
  };

  const getCardBorderColor = () => {
    if (isAdmin) return 'border-destructive/20';
    if (isModerator) return 'border-blue-500/20';
    if (isSupport) return 'border-green-500/20';
    return '';
  };

  const getCardHoverColor = () => {
    if (isAdmin) return 'hover:bg-destructive/5';
    if (isModerator) return 'hover:bg-blue-500/5';
    if (isSupport) return 'hover:bg-green-500/5';
    return '';
  };

  const getIconBgColor = () => {
    if (isAdmin) return 'bg-destructive/10';
    if (isModerator) return 'bg-blue-500/10';
    if (isSupport) return 'bg-green-500/10';
    return '';
  };

  const getIconColor = () => {
    if (isAdmin) return 'text-destructive';
    if (isModerator) return 'text-blue-500';
    if (isSupport) return 'text-green-500';
    return '';
  };

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
                className={`group transition-all ${(card.href || card.onClick) ? 'cursor-pointer hover:bg-muted/50 hover:shadow-md' : 'opacity-75'}`}
                onClick={() => {
                  if (card.onClick) card.onClick();
                  else if (card.href) navigate(card.href);
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <card.icon className="h-5 w-5 text-primary" />
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

          {/* Integrations Settings Panel */}
          {showIntegrations && (
            <div className="mt-6">
              <IntegrationsSettings />
            </div>
          )}

          {/* App Settings Panel (Admin only) */}
          {isAdmin && showAppSettings && (
            <div className="mt-6">
              <AppSettings />
            </div>
          )}

          {/* User Notification Preferences Panel */}
          {showUserNotificationPrefs && (
            <div className="mt-6">
              <UserNotificationPreferences />
            </div>
          )}
        </section>

        {/* Administration (Staff - Admin, Moderator, Support) */}
        {isStaff && adminCards.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {getSectionTitle()}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {adminCards.map((card) => (
                <Card 
                  key={card.title} 
                  className={`group transition-all ${getCardBorderColor()} ${(card.href || card.onClick) ? `cursor-pointer ${getCardHoverColor()} hover:shadow-md` : 'opacity-75'}`}
                  onClick={() => {
                    if (card.onClick) card.onClick();
                    else if (card.href) navigate(card.href);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-lg ${getIconBgColor()}`}>
                        <card.icon className={`h-5 w-5 ${getIconColor()}`} />
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

            {/* Customer Messages Panel (Admin & Moderator) */}
            {(isAdmin || isModerator) && showCustomerMessages && (
              <div className="mt-6">
                <CustomerMessagesManager />
              </div>
            )}

            {/* Content Reports Panel (Admin & Moderator) */}
            {(isAdmin || isModerator) && showContentReports && (
              <div className="mt-6">
                <ContentReportsManager />
              </div>
            )}

            {/* Role Access Guide Panel (Admin only) */}
            {isAdmin && showRoleGuide && (
              <div className="mt-6">
                <RoleAccessGuide />
              </div>
            )}

            {/* Tutorials Management Panel (Admin & Support) */}
            {(isAdmin || isSupport) && showTutorials && (
              <div className="mt-6">
                <TutorialsManager />
              </div>
            )}

            {/* Notification Preferences Panel (All Staff) */}
            {isStaff && showNotificationPrefs && (
              <div className="mt-6">
                <NotificationPreferences />
              </div>
            )}

            {/* Performance Goals Panel (Admin only) */}
            {isAdmin && showPerformanceGoals && (
              <div className="mt-6">
                <PerformanceGoals />
              </div>
            )}

            {/* Permissions Manager Panel (Admin only) */}
            {isAdmin && showPermissions && (
              <div className="mt-6">
                <PermissionsManager />
              </div>
            )}

            {/* Content Visibility Panel (Admin only) */}
            {isAdmin && showVisibility && (
              <div className="mt-6">
                <ContentVisibilityManager />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Settings;
