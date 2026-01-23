import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";

export function useFollowing(targetUserId?: string) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (targetUserId) {
      fetchFollowStatus();
    }
  }, [user, targetUserId]);

  const fetchFollowStatus = async () => {
    if (!targetUserId) return;
    
    try {
      // Check if current user is following this user
      if (user) {
        const { data: followData } = await supabase
          .from("followers")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId)
          .maybeSingle();
        
        setIsFollowing(!!followData);
      }

      // Get followers count
      const { count: followers } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", targetUserId);

      // Get following count
      const { count: following } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", targetUserId);

      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
    } catch (error) {
      console.error("Error fetching follow status:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!user || !targetUserId || user.id === targetUserId) return;

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from("followers")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
        
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        // Follow
        await supabase
          .from("followers")
          .insert({
            follower_id: user.id,
            following_id: targetUserId
          });
        
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);

        // Trigger push notification for new follower (fire and forget)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        fetch(`${supabaseUrl}/functions/v1/notify-new-follower`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user.id,
            followingId: targetUserId
          })
        }).catch(err => console.log("Notification sent:", err));
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  return {
    isFollowing,
    followersCount,
    followingCount,
    loading,
    toggleFollow,
    refetch: fetchFollowStatus
  };
}

export function useFollowingFeed() {
  const { user } = useAuth();
  const [followedBakes, setFollowedBakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFollowingFeed();
    }
  }, [user]);

  const fetchFollowingFeed = async () => {
    if (!user) return;

    try {
      // Get list of users the current user follows
      const { data: followingData } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!followingData || followingData.length === 0) {
        setFollowedBakes([]);
        setLoading(false);
        return;
      }

      const followingIds = followingData.map(f => f.following_id);

      // Fetch bakes from followed users using public_profiles view (excludes email)
      const { data: bakes, error } = await supabase
        .from("bake_shares")
        .select(`
          id,
          image_url,
          description,
          rating,
          created_at,
          user_id,
          premix:premixes(name, difficulty),
          profile:public_profiles(id, name, avatar_url)
        `)
        .in("user_id", followingIds)
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get likes for each bake
      const bakesWithLikes = await Promise.all(
        (bakes || []).map(async (bake) => {
          const { count } = await supabase
            .from("bake_likes")
            .select("*", { count: "exact", head: true })
            .eq("bake_share_id", bake.id);
          
          return {
            ...bake,
            likes_count: count || 0
          };
        })
      );

      setFollowedBakes(bakesWithLikes);
    } catch (error) {
      console.error("Error fetching following feed:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    followedBakes,
    loading,
    refetch: fetchFollowingFeed
  };
}
