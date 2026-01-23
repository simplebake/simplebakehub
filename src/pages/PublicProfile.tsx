import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useFollowing } from "@/hooks/useFollowing";
import { Loader2, MapPin, Calendar, Heart, Award, ChefHat, Lock, ArrowLeft, UserPlus, UserMinus, Users } from "lucide-react";
import { format } from "date-fns";
import { AchievementBadges } from "@/components/AchievementBadges";

interface PublicProfile {
  id: string;
  name: string;
  country: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
  is_public: boolean;
  favorite_bread_type: string | null;
  baking_since: string | null;
}

interface BakeShare {
  id: string;
  image_url: string;
  description: string | null;
  rating: number | null;
  created_at: string;
  premix: {
    name: string;
    difficulty: string;
  } | null;
  likes_count: number;
}

interface ProfileStats {
  totalBakes: number;
  totalLikes: number;
  achievementsCount: number;
}

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isFollowing, followersCount, followingCount, toggleFollow, loading: followLoading } = useFollowing(userId);
  
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [bakes, setBakes] = useState<BakeShare[]>([]);
  const [stats, setStats] = useState<ProfileStats>({ totalBakes: 0, totalLikes: 0, achievementsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  
  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      // Fetch profile from public_profiles view (excludes email for security)
      const { data: profileData, error: profileError } = await supabase
        .from("public_profiles")
        .select("id, name, country, avatar_url, cover_image_url, bio, is_public, favorite_bread_type, baking_since")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        navigate("/");
        return;
      }

      if (!profileData.is_public) {
        setIsPrivate(true);
        setProfile(profileData);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch bakes with likes count
      const { data: bakesData, error: bakesError } = await supabase
        .from("bake_shares")
        .select(`
          id,
          image_url,
          description,
          rating,
          created_at,
          premix:premixes(name, difficulty)
        `)
        .eq("user_id", userId)
        .eq("is_visible", true)
        .order("created_at", { ascending: false });

      if (bakesError) throw bakesError;

      // Get likes for each bake
      const bakesWithLikes = await Promise.all(
        (bakesData || []).map(async (bake) => {
          const { count } = await supabase
            .from("bake_likes")
            .select("*", { count: "exact", head: true })
            .eq("bake_share_id", bake.id);
          
          return {
            ...bake,
            premix: bake.premix as { name: string; difficulty: string } | null,
            likes_count: count || 0
          };
        })
      );

      setBakes(bakesWithLikes);

      // Calculate stats
      const totalLikes = bakesWithLikes.reduce((sum, bake) => sum + bake.likes_count, 0);

      // Get achievements count
      const { count: achievementsCount } = await supabase
        .from("user_achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      setStats({
        totalBakes: bakesWithLikes.length,
        totalLikes,
        achievementsCount: achievementsCount || 0
      });

    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isPrivate && profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent className="space-y-4">
              <Lock className="h-16 w-16 mx-auto text-muted-foreground" />
              <h2 className="text-2xl font-bold">{profile.name}</h2>
              <p className="text-muted-foreground">
                This baker prefers to keep their profile private.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/40">
        {profile.cover_image_url && (
          <img
            src={profile.cover_image_url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <main className="container mx-auto px-4">
        {/* Profile Header */}
        <div className="relative -mt-16 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full border-4 border-background bg-muted overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <ChefHat className="h-12 w-12 text-primary" />
                </div>
              )}
            </div>

            {/* Name and Info */}
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-3xl font-bold">{profile.name}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground mt-1">
                    {profile.country && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {profile.country}
                      </span>
                    )}
                    {profile.baking_since && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Baking since {format(new Date(profile.baking_since), "MMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Follow Button */}
                {user && !isOwnProfile && (
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    onClick={toggleFollow}
                    disabled={followLoading}
                    className="flex items-center gap-2"
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              {/* Followers/Following counts */}
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <strong>{followersCount}</strong>
                  <span className="text-muted-foreground">followers</span>
                </span>
                <span>
                  <strong>{followingCount}</strong>
                  <span className="text-muted-foreground ml-1">following</span>
                </span>
              </div>
              
              {profile.favorite_bread_type && (
                <Badge variant="secondary" className="mt-2">
                  Loves: {profile.favorite_bread_type}
                </Badge>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-4 text-muted-foreground max-w-2xl">{profile.bio}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <ChefHat className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{stats.totalBakes}</div>
              <div className="text-sm text-muted-foreground">Bakes Shared</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Heart className="h-6 w-6 mx-auto mb-2 text-destructive" />
              <div className="text-2xl font-bold">{stats.totalLikes}</div>
              <div className="text-sm text-muted-foreground">Total Likes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{stats.achievementsCount}</div>
              <div className="text-sm text-muted-foreground">Achievements</div>
            </CardContent>
          </Card>
        </div>

        {/* Bakes Gallery */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Baking Gallery</h2>
          {bakes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No bakes shared yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {bakes.map((bake) => (
                <Card key={bake.id} className="overflow-hidden group">
                  <div className="aspect-square relative">
                    <img
                      src={bake.image_url}
                      alt={bake.premix?.name || "Bake"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-2 left-2 right-2 text-background">
                        <p className="font-semibold text-sm truncate">
                          {bake.premix?.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {bake.likes_count}
                          </span>
                          {bake.rating && (
                            <span>⭐ {bake.rating}/5</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Link to Community */}
        <div className="text-center pb-8">
          <Link to="/share">
            <Button variant="outline">
              View Community Feed
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default PublicProfile;
