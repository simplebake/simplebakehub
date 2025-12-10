import { NavLink } from "./NavLink";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { logAuthEvent } from "@/lib/auditLogger";
import { useNavigate } from "react-router-dom";
import { ChefHat, LogOut, Home, Megaphone, Cog } from "lucide-react";
import { CartDrawer } from "./CartDrawer";

const navItems = [
  {
    label: "Home",
    path: "/",
    icon: Home,
    ariaLabel: "Home overview",
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
];

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const userId = user?.id;
    await supabase.auth.signOut();
    
    if (userId) {
      await logAuthEvent('signout', userId);
    }
    
    navigate("/");
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
            <ChefHat className="h-6 w-6" />
            Simple Bake Lab
          </NavLink>

          <nav className="flex items-center gap-6">
            {user ? (
              <>
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    activeClassName="text-foreground"
                    aria-label={item.ariaLabel}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
                <CartDrawer />
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <NavLink
                  to="/shop"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-foreground"
                >
                  Shop
                </NavLink>
                <NavLink to="/auth">
                  <Button>Sign In</Button>
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
