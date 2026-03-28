import { useAuth } from "@/lib/supabase";
import { Header } from "@/components/Header";
import { DesktopSidebar } from "./DesktopSidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logAuthEvent } from "@/lib/auditLogger";
import { useQuery } from "@tanstack/react-query";
import { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { data: unreadCount = 0 } = useUnreadNotifications();

  const { data: profile } = useQuery({
    queryKey: ["layout-profile", user?.id],
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
    <div className="min-h-screen flex w-full">
      {/* Desktop sidebar — only for logged-in users */}
      {user && (
        <DesktopSidebar
          profile={profile}
          initials={initials}
          isAdmin={isAdmin}
          unreadCount={unreadCount}
          onLogout={handleLogout}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 pb-16 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
};
