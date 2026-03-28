import { NavLink } from "./NavLink";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/supabase";
import { ChefHat, Bell, Menu } from "lucide-react";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { SidebarTrigger } from "./ui/sidebar";

interface HeaderProps {
  onMenuOpen?: () => void;
}

export const Header = ({ onMenuOpen }: HeaderProps) => {
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useUnreadNotifications();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="px-4 max-w-7xl mx-auto">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Desktop sidebar trigger */}
            {user && (
              <SidebarTrigger className="hidden lg:flex h-9 w-9 text-muted-foreground" />
            )}

            {/* Logo — mobile only; desktop sidebar has its own */}
            <NavLink
              to="/"
              className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors lg:hidden"
              aria-label="Simple Bake Hub home"
            >
              <ChefHat className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="hidden sm:inline">Simple Bake Hub</span>
            </NavLink>
          </div>

          {user ? (
            <div className="flex items-center gap-1">
              {/* Notifications — desktop only (mobile uses bottom nav) */}
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

            </div>
          ) : (
            <NavLink to="/auth">
              <Button size="sm">Sign In</Button>
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
};
