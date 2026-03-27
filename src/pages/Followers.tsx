import { useState, useEffect } from "react";
import { useAuth } from "@/lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, UserPlus, UserMinus, ChefHat, Loader2 } from "lucide-react";

interface FollowUser {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  isFollowing?: boolean;
}

const Followers = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchFollowData();
    }
  }, [user]);

  const fetchFollowData = async () => {
    if (!user) return;

    try {
      // Fetch followers (people who follow the current user)
      const { data: followersData, error: followersError } = await supabase
        .from("followers")
        .select("follower_id")
        .eq("following_id", user.id);

      if (followersError) throw followersError;

      // Fetch following (people the current user follows)
      const { data: followingData, error: followingError } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followingError) throw followingError;

      const followerIds = (followersData || []).map(f => f.follower_id);
      const followingIds = new Set((followingData || []).map(f => f.following_id));
      const allIds = [...new Set([...followerIds, ...Array.from(followingIds)])];

      // Fetch profiles for all relevant users
      let profilesMap: Record<string, any> = {};
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from("public_profiles")
          .select("id, name, avatar_url, bio")
          .in("id", allIds);

        (profiles || []).forEach(p => {
          if (p.id) profilesMap[p.id] = p;
        });
      }

      // Transform followers data
      const transformedFollowers = followerIds
        .filter(id => profilesMap[id])
        .map(id => ({
          id: profilesMap[id].id,
          name: profilesMap[id].name,
          avatar_url: profilesMap[id].avatar_url,
          bio: profilesMap[id].bio,
          isFollowing: followingIds.has(id),
        }));

      // Transform following data
      const transformedFollowing = Array.from(followingIds)
        .filter(id => profilesMap[id])
        .map(id => ({
          id: profilesMap[id].id,
          name: profilesMap[id].name,
          avatar_url: profilesMap[id].avatar_url,
          bio: profilesMap[id].bio,
          isFollowing: true,
        }));

      setFollowers(transformedFollowers);
      setFollowing(transformedFollowing);
    } catch (error) {
      console.error("Error fetching follow data:", error);
      toast.error("Failed to load followers");
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetUserId: string, currentlyFollowing: boolean) => {
    if (!user) return;

    setActionLoading(targetUserId);

    try {
      if (currentlyFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("followers")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);

        if (error) throw error;
        toast.success("Unfollowed successfully");
      } else {
        // Follow
        const { error } = await supabase
          .from("followers")
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });

        if (error) throw error;
        toast.success("Now following!");
      }

      fetchFollowData();
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFollower = async (followerId: string) => {
    if (!user) return;

    setActionLoading(followerId);

    try {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", user.id);

      if (error) throw error;
      toast.success("Follower removed");
      fetchFollowData();
    } catch (error) {
      console.error("Error removing follower:", error);
      toast.error("Failed to remove follower");
    } finally {
      setActionLoading(null);
    }
  };

  const UserCard = ({ 
    userItem, 
    showFollowBack = false,
    showRemove = false 
  }: { 
    userItem: FollowUser; 
    showFollowBack?: boolean;
    showRemove?: boolean;
  }) => (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <Link to={`/baker/${userItem.id}`}>
        <Avatar className="h-12 w-12">
          <AvatarImage src={userItem.avatar_url || undefined} />
          <AvatarFallback>
            <ChefHat className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <Link 
          to={`/baker/${userItem.id}`}
          className="font-medium hover:text-primary transition-colors"
        >
          {userItem.name}
        </Link>
        {userItem.bio && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {userItem.bio}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showFollowBack && !userItem.isFollowing && (
          <Button
            size="sm"
            onClick={() => handleFollowToggle(userItem.id, false)}
            disabled={actionLoading === userItem.id}
          >
            {actionLoading === userItem.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-1" />
                Follow Back
              </>
            )}
          </Button>
        )}
        {showFollowBack && userItem.isFollowing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleFollowToggle(userItem.id, true)}
            disabled={actionLoading === userItem.id}
          >
            {actionLoading === userItem.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserMinus className="h-4 w-4 mr-1" />
                Unfollow
              </>
            )}
          </Button>
        )}
        {!showFollowBack && userItem.isFollowing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleFollowToggle(userItem.id, true)}
            disabled={actionLoading === userItem.id}
          >
            {actionLoading === userItem.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserMinus className="h-4 w-4 mr-1" />
                Unfollow
              </>
            )}
          </Button>
        )}
        {showRemove && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => handleRemoveFollower(userItem.id)}
            disabled={actionLoading === userItem.id}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Your Connections
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your followers and the bakers you follow
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="followers">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="followers" className="gap-2">
                  <Users className="h-4 w-4" />
                  Followers ({followers.length})
                </TabsTrigger>
                <TabsTrigger value="following" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Following ({following.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="followers">
                {followers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">
                      No one is following you yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Share your bakes to get noticed by the community!
                    </p>
                    <Button onClick={() => navigate("/share")} className="mt-4">
                      Share a Bake
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {followers.map(follower => (
                      <UserCard 
                        key={follower.id} 
                        userItem={follower} 
                        showFollowBack
                        showRemove
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="following">
                {following.length === 0 ? (
                  <div className="text-center py-12">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">
                      You're not following anyone yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Discover talented bakers in the community!
                    </p>
                    <Button onClick={() => navigate("/share")} className="mt-4">
                      Explore Community
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {following.map(followedUser => (
                      <UserCard 
                        key={followedUser.id} 
                        userItem={followedUser} 
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Followers;
