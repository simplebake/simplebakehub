import { NavLink } from "./NavLink";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ChefHat, LogOut, Shield, User } from "lucide-react";
import { CartDrawer } from "./CartDrawer";
import { useUserRole } from "@/hooks/useUserRole";

export const Header = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
                <NavLink
                  to="/dashboard"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-foreground"
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/premixes"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-foreground"
                >
                  Guided Bakes
                </NavLink>
                <NavLink
                  to="/tutorials"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-foreground"
                >
                  Tutorials
                </NavLink>
                <NavLink
                  to="/shop"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-foreground"
                >
                  Shop
                </NavLink>
                <NavLink
                  to="/share"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-foreground"
                >
                  Share Your Bake
                </NavLink>
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    activeClassName="text-foreground"
                  >
                    <Shield className="h-4 w-4 inline mr-1" />
                    Admin
                  </NavLink>
                )}
                <CartDrawer />
                <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                  <User className="h-4 w-4" />
                </Button>
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
