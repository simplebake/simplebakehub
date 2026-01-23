import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Heart, Users, ChefHat } from "lucide-react";
import { useFollowingFeed } from "@/hooks/useFollowing";
import { formatDistanceToNow } from "date-fns";

export function FollowingFeed() {
  const { followedBakes, loading } = useFollowingFeed();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            From Bakers You Follow
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (followedBakes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            From Bakers You Follow
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">
            Follow other bakers to see their latest creations here!
          </p>
          <Link to="/share">
            <Button variant="outline">
              Discover Bakers
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          From Bakers You Follow
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {followedBakes.slice(0, 5).map((bake) => (
            <div key={bake.id} className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={bake.image_url}
                  alt={bake.premix?.name || "Bake"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link to={`/baker/${bake.profile?.id}`}>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={bake.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        <ChefHat className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <Link 
                    to={`/baker/${bake.profile?.id}`}
                    className="font-medium text-sm hover:text-primary transition-colors truncate"
                  >
                    {bake.profile?.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(bake.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm font-medium truncate">
                  {bake.premix?.name}
                </p>
                {bake.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {bake.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
          ))}
        </div>
        {followedBakes.length > 5 && (
          <div className="mt-4 text-center">
            <Link to="/share">
              <Button variant="ghost" size="sm">
                View All ({followedBakes.length} bakes)
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
