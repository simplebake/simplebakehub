import { NavLink } from "./NavLink";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { logAuthEvent } from "@/lib/auditLogger";
import { useNavigate } from "react-router-dom";
import { ChefHat, LogOut, Home, Megaphone, Cog, MessageSquare, BookOpen, Cookie } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const navItems = [
  {
    label: "Home",
    path: "/",
    icon: Home,
    ariaLabel: "Home overview",
  },
  {
    label: "Guided Bakes",
    path: "/premixes",
    icon: Cookie,
    ariaLabel: "Guided baking premixes",
  },
  {
    label: "Marketing & Customers",
    path: "/marketing",
    icon: Megaphone,
    ariaLabel: "Marketing and customer tools",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Cog,
    ariaLabel: "Settings and admin",
  },
  {
    label: "Contact",
    path: "/contact",
    icon: MessageSquare,
    ariaLabel: "Send feedback or get help",
  },
];

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSupport, isAdmin } = useUserRole();

  const handleLogout = async () => {
    const userId = user?.id;
    await supabase.auth.signOut();
    
    if (userId) {
      await logAuthEvent('signout', userId);
    }
    
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 text-xl font-semibold text-foreground hover:text-primary transition-colors">
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline">Simple Bake Lab</span>
          </NavLink>

          <nav className="flex items-center gap-1 sm:gap-2">
            {user ? (
              <>
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                    activeClassName="text-foreground bg-muted"
                    aria-label={item.ariaLabel}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </NavLink>
                ))}
                {(isSupport || isAdmin) && (
                  <NavLink
                    to="/tutorials/manage"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                    activeClassName="text-foreground bg-muted"
                    aria-label="Manage tutorials"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden md:inline">Tutorials</span>
                  </NavLink>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2 text-muted-foreground hover:text-foreground">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Logout</span>
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <NavLink to="/auth">
                  <Button size="sm">Sign In</Button>
                </NavLink>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
