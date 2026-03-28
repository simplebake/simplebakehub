import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { LogOut, X, ChefHat, ClipboardList } from "lucide-react";
import { navGroups, adminItems } from "./navData";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

interface DrawerNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: { name: string; avatar_url: string | null } | null | undefined;
  initials: string;
  isAdmin: boolean;
  unreadCount: number;
  onLogout: () => void;
}

const NotificationBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
};

export const DrawerNav = ({
  open,
  onOpenChange,
  profile,
  initials,
  isAdmin,
  unreadCount,
  onLogout,
}: DrawerNavProps) => {
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-72 p-0 overflow-y-auto">
        {/* Profile header with quick actions */}
        <div className="border-b border-border">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || "User"} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground truncate">{profile?.name || "User"}</p>
              <NavLink
                to="/profile"
                className="text-xs text-primary/80 hover:text-primary font-medium transition-colors"
                onClick={close}
              >
                View profile →
              </NavLink>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close menu">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 px-4 pb-3">
            <NavLink
              to="/share"
              onClick={close}
              className="flex items-center gap-1.5 flex-1 justify-center rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <ChefHat className="h-3.5 w-3.5 text-rose-500" />
              Share a Bake
            </NavLink>
            <NavLink
              to="/feeding-log"
              onClick={close}
              className="flex items-center gap-1.5 flex-1 justify-center rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <ClipboardList className="h-3.5 w-3.5 text-emerald-500" />
              Log Feeding
            </NavLink>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="py-3 px-2">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-2">
              <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {group.title}
              </p>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className="relative flex items-center gap-3 px-3 py-3 text-[15px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 rounded-lg border-l-2 border-transparent transition-all"
                  activeClassName="text-foreground bg-primary/5 font-semibold border-l-2 !border-primary"
                  aria-label={item.ariaLabel}
                  onClick={close}
                >
                  <item.icon className={`h-5 w-5 shrink-0 ${item.iconColor || "text-muted-foreground"}`} />
                  <span>{item.label}</span>
                  {item.path === "/notifications" && <NotificationBadge count={unreadCount} />}
                </NavLink>
              ))}
            </div>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <div className="mb-2">
              <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Admin
              </p>
              {adminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 px-3 py-3 text-[15px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 rounded-lg border-l-2 border-transparent transition-all"
                  activeClassName="text-foreground bg-primary/5 font-semibold border-l-2 !border-primary"
                  aria-label={item.ariaLabel}
                  onClick={close}
                >
                  <item.icon className={`h-5 w-5 shrink-0 ${item.iconColor || "text-muted-foreground"}`} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="border-t border-border mx-2 px-3 py-4">
          <Button
            variant="ghost"
            size="default"
            onClick={() => {
              close();
              onLogout();
            }}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive font-medium text-[15px]"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
