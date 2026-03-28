import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogOut, ChefHat } from "lucide-react";
import { navGroups, adminItems } from "./navData";

interface DesktopSidebarProps {
  profile: { name: string; avatar_url: string | null } | null | undefined;
  initials: string;
  isAdmin: boolean;
  unreadCount: number;
  onLogout: () => void;
}

export const DesktopSidebar = ({
  profile,
  initials,
  isAdmin,
  unreadCount,
  onLogout,
}: DesktopSidebarProps) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="hidden lg:flex border-r border-border">
      <SidebarContent className="pt-2">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-3">
          <ChefHat className="h-5 w-5 text-primary shrink-0" />
          {!collapsed && (
            <span className="text-base font-bold text-foreground truncate">Simple Bake Hub</span>
          )}
        </div>

        {/* Profile compact */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <NavLink
              to="/profile"
              className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-muted/60 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{profile?.name || "User"}</p>
              </div>
            </NavLink>
          </div>
        )}

        {navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.path}
                        end={item.path === "/"}
                        className="flex items-center gap-3 rounded-lg border-l-2 border-transparent text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-all"
                        activeClassName="text-foreground bg-primary/5 font-semibold !border-primary"
                      >
                        <item.icon className={`h-4 w-4 shrink-0 ${item.iconColor || "text-muted-foreground"}`} />
                        {!collapsed && <span>{item.label}</span>}
                        {!collapsed && item.path === "/notifications" && unreadCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.path}
                        className="flex items-center gap-3 rounded-lg border-l-2 border-transparent text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-all"
                        activeClassName="text-foreground bg-primary/5 font-semibold !border-primary"
                      >
                        <item.icon className={`h-4 w-4 shrink-0 ${item.iconColor || "text-muted-foreground"}`} />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className={`w-full gap-2 text-muted-foreground hover:text-destructive ${collapsed ? "justify-center px-0" : "justify-start"}`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Log out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
