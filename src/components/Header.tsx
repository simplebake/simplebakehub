import { NavLink } from "./NavLink";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { logAuthEvent } from "@/lib/auditLogger";
import { useNavigate } from "react-router-dom";
import { ChefHat, Bell, Menu } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DrawerNav } from "./navigation/DrawerNav";
import { BottomNav } from "./navigation/BottomNav";

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { data: unreadCount = 0 } = useUnreadNotifications();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["header-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const initials = profile?.name
    ?.split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const handleLogout = async () => {
    const userId = user?.id;
    await supabase.auth.signOut();
    if (userId) {
      await logAuthEvent("signout", userId);
    }
    navigate("/");
  };

  // Attempt to read sidebar context — will be undefined when no SidebarProvider
  let hasSidebar = false;
  try {
    const ctx = useSidebar();
    hasSidebar = !!ctx;
  } catch {
    hasSidebar = false;
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="px-4 max-w-7xl mx-auto">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Desktop sidebar trigger — only on lg+ */}
              {user && hasSidebar && (
                <SidebarTrigger className="hidden lg:flex h-9 w-9 text-muted-foreground" />
              )}

              {/* Logo */}
              <NavLink
                to="/"
                className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors"
                aria-label="Simple Bake Hub home"
              >
                <ChefHat className="h-5 w-5 text-primary lg:hidden" aria-hidden="true" />
                <span className="hidden sm:inline lg:hidden">Simple Bake Hub</span>
              </NavLink>
            </div>

            {user ? (
              <div className="flex items-center gap-1">
                {/* Notifications — visible on lg+ (mobile uses bottom nav) */}
                <NavLink
                  to="/notifications"
                  className="relative hidden lg:flex items-center p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                  activeClassName="text-foreground bg-muted"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </NavLink>

                {/* Hamburger — visible on mobile only (desktop has sidebar) */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground lg:hidden"
                  aria-label="Open menu"
                  onClick={() => setDrawerOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>

                {/* Drawer menu — available everywhere but mainly for mobile */}
                <DrawerNav
                  open={drawerOpen}
                  onOpenChange={setDrawerOpen}
                  profile={profile}
                  initials={initials}
                  isAdmin={isAdmin}
                  unreadCount={unreadCount}
                  onLogout={handleLogout}
                />
              </div>
            ) : (
              <NavLink to="/auth">
                <Button size="sm">Sign In</Button>
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* Bottom nav for mobile only when logged in */}
      {user && <BottomNav onMenuOpen={() => setDrawerOpen(true)} />}
    </>
  );
};
