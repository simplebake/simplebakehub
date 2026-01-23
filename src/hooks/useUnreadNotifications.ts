import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { useEffect } from "react";

export const useUnreadNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate query to refetch count on any change
          queryClient.invalidateQueries({ 
            queryKey: ["unread-notifications-count", user.id] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["unread-notifications-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Error fetching unread notifications:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user,
  });
};
