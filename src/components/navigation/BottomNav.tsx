import { NavLink } from "@/components/NavLink";
import { Menu, Bell } from "lucide-react";
import { bottomNavItems, isImmersiveRoute } from "./navData";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useLocation } from "react-router-dom";

interface BottomNavProps {
  onMenuOpen: () => void;
}

export const BottomNav = ({ onMenuOpen }: BottomNavProps) => {
  const { data: unreadCount = 0 } = useUnreadNotifications();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden">
      <div className="flex items-stretch justify-around h-14 max-w-lg mx-auto">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 text-muted-foreground transition-colors"
            activeClassName="text-primary"
            aria-label={item.ariaLabel}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}

        {/* Notifications with badge */}
        <NavLink
          to="/notifications"
          className="relative flex flex-col items-center justify-center gap-0.5 flex-1 text-muted-foreground transition-colors"
          activeClassName="text-primary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="text-[10px] font-medium">Alerts</span>
        </NavLink>

        {/* Menu button */}
        <button
          onClick={onMenuOpen}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
};
