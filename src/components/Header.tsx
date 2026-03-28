import { NavLink } from "./NavLink";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { logAuthEvent } from "@/lib/auditLogger";
import { useNavigate } from "react-router-dom";
import {
  ChefHat, LogOut, Home, Megaphone, Cog, MessageSquare, BookOpen,
  Cookie, Users, Search, Bell, FlaskConical, Calculator, Bot,
  ClipboardList, GraduationCap, Menu, X,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "./ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const NotificationBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
};

const navGroups = [
  {
    title: "Overview",
    items: [
      { label: "Home", path: "/", icon: Home, ariaLabel: "Home overview" },
    ],
  },
  {
    title: "Baking Tools",
    items: [
      { label: "Guided Bakes", path: "/premixes", icon: Cookie, ariaLabel: "Guided baking premixes" },
      { label: "Dough Calculator", path: "/dough", icon: Calculator, ariaLabel: "Dough calculator" },
    ],
  },
  {
    title: "Starter Management",
    items: [
      { label: "Feeding Log", path: "/feeding-log", icon: ClipboardList, ariaLabel: "Track starter feedings" },
      { label: "Starter Check", path: "/starter", icon: FlaskConical, ariaLabel: "Check starter health" },
      { label: "Starter AI", path: "/starter-guide", icon: Bot, ariaLabel: "AI sourdough assistant" },
    ],
  },
  {
    title: "Learning",
    items: [
      { label: "Tutorials", path: "/tutorials", icon: GraduationCap, ariaLabel: "Browse baking tutorials" },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "Community Feed", path: "/share", icon: ChefHat, ariaLabel: "Community bakes feed" },
      { label: "Discover Bakers", path: "/discover", icon: Search, ariaLabel: "Discover new bakers to follow" },
      { label: "Connections", path: "/followers", icon: Users, ariaLabel: "Your followers and following" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Notifications", path: "/notifications", icon: Bell, ariaLabel: "View your notifications" },
      { label: "Settings", path: "/settings", icon: Cog, ariaLabel: "Settings and admin" },
      { label: "Contact Us", path: "/contact", icon: MessageSquare, ariaLabel: "Send feedback or get help" },
    ],
  },
];

// Compact desktop nav — key items only
const desktopNav = [
  { label: "Home", path: "/", icon: Home, ariaLabel: "Home" },
  { label: "Bakes", path: "/premixes", icon: Cookie, ariaLabel: "Guided bakes" },
  { label: "Feeding", path: "/feeding-log", icon: ClipboardList, ariaLabel: "Feeding log" },
  { label: "Community", path: "/share", icon: ChefHat, ariaLabel: "Community" },
  { label: "Tutorials", path: "/tutorials", icon: GraduationCap, ariaLabel: "Tutorials" },
];

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { data: unreadCount = 0 } = useUnreadNotifications();
  const [open, setOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <NavLink
            to="/"
            className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors"
            aria-label="Simple Bake Hub home"
          >
            <ChefHat className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="hidden sm:inline">Simple Bake Hub</span>
          </NavLink>

          {user ? (
            <div className="flex items-center gap-1">
              {/* Desktop nav — hidden on mobile */}
              <nav className="hidden lg:flex items-center gap-1">
                {desktopNav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                    activeClassName="text-foreground bg-muted"
                    aria-label={item.ariaLabel}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              {/* Notifications shortcut (always visible) */}
              <NavLink
                to="/notifications"
                className="relative flex items-center p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                activeClassName="text-foreground bg-muted"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <NotificationBadge count={unreadCount} />
              </NavLink>

              {/* Hamburger menu */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0 overflow-y-auto">
                  <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || "User"} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{profile?.name || "User"}</p>
                      <NavLink
                        to="/profile"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        View profile
                      </NavLink>
                    </div>
                    <SheetClose asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close menu">
                        <X className="h-4 w-4" />
                      </Button>
                    </SheetClose>
                  </div>

                  <nav className="py-2">
                    {navGroups.map((group) => (
                      <div key={group.title} className="mb-1">
                        <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                          {group.title}
                        </p>
                        {group.items.map((item) => (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/"}
                            className="relative flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            activeClassName="text-foreground bg-muted font-medium"
                            aria-label={item.ariaLabel}
                            onClick={() => setOpen(false)}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                            {item.path === "/notifications" && <NotificationBadge count={unreadCount} />}
                          </NavLink>
                        ))}
                      </div>
                    ))}

                    {/* Admin section */}
                    {isAdmin && (
                      <div className="mb-1">
                        <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                          Admin
                        </p>
                        <NavLink
                          to="/marketing"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          activeClassName="text-foreground bg-muted font-medium"
                          aria-label="Marketing and customer tools"
                          onClick={() => setOpen(false)}
                        >
                          <Megaphone className="h-4 w-4 shrink-0" />
                          <span>Marketing & Customers</span>
                        </NavLink>
                        <NavLink
                          to="/tutorials/manage"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          activeClassName="text-foreground bg-muted font-medium"
                          aria-label="Manage tutorials"
                          onClick={() => setOpen(false)}
                        >
                          <BookOpen className="h-4 w-4 shrink-0" />
                          <span>Manage Tutorials</span>
                        </NavLink>
                      </div>
                    )}
                  </nav>

                  {/* Logout */}
                  <div className="border-t border-border px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setOpen(false);
                        handleLogout();
                      }}
                      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
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
