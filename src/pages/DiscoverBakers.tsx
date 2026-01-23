import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useFollowing } from "@/hooks/useFollowing";
import { useNavigate } from "react-router-dom";
import { Search, Users, MapPin, Cake, Calendar } from "lucide-react";

const COUNTRIES = [
  "All Countries",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Other"
];

const BREAD_TYPES = [
  "All Types",
  "Sourdough",
  "Whole Wheat",
  "Gluten-Free",
  "Artisan",
  "Quick Breads",
  "Flatbreads"
];

const EXPERIENCE_LEVELS = [
  { label: "Any Experience", value: "all" },
  { label: "Beginner (< 1 year)", value: "beginner" },
  { label: "Intermediate (1-3 years)", value: "intermediate" },
  { label: "Experienced (3+ years)", value: "experienced" }
];

const DiscoverBakers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("All Countries");
  const [breadTypeFilter, setBreadTypeFilter] = useState("All Types");
  const [experienceFilter, setExperienceFilter] = useState("all");

  const { data: bakers, isLoading } = useQuery({
    queryKey: ["discover-bakers", countryFilter, breadTypeFilter, experienceFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("public_profiles")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (countryFilter !== "All Countries") {
        query = query.eq("country", countryFilter);
      }

      if (breadTypeFilter !== "All Types") {
        query = query.eq("favorite_bread_type", breadTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];

      // Filter by search query
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(baker => 
          baker.name?.toLowerCase().includes(lowerQuery) ||
          baker.bio?.toLowerCase().includes(lowerQuery)
        );
      }

      // Filter by experience level
      if (experienceFilter !== "all") {
        const now = new Date();
        filtered = filtered.filter(baker => {
          if (!baker.baking_since) return experienceFilter === "beginner";
          const startDate = new Date(baker.baking_since);
          const years = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          
          switch (experienceFilter) {
            case "beginner": return years < 1;
            case "intermediate": return years >= 1 && years < 3;
            case "experienced": return years >= 3;
            default: return true;
          }
        });
      }

      // Exclude current user
      if (user) {
        filtered = filtered.filter(baker => baker.id !== user.id);
      }

      return filtered;
    }
  });

  const { data: followingList } = useQuery({
    queryKey: ["following-list", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", user.id);
      return data?.map(f => f.following_id) || [];
    },
    enabled: !!user
  });

  const getExperienceYears = (bakingSince: string | null) => {
    if (!bakingSince) return null;
    const years = Math.floor((Date.now() - new Date(bakingSince).getTime()) / (1000 * 60 * 60 * 24 * 365));
    return years;
  };

  const BakerCard = ({ baker }: { baker: any }) => {
    const { isFollowing, toggleFollow, loading: followLoading } = useFollowing(baker.id);
    const years = getExperienceYears(baker.baking_since);

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar 
              className="h-16 w-16 cursor-pointer" 
              onClick={() => navigate(`/baker/${baker.id}`)}
            >
              <AvatarImage src={baker.avatar_url || ""} alt={baker.name} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {baker.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h3 
                className="font-semibold text-lg truncate cursor-pointer hover:text-primary transition-colors"
                onClick={() => navigate(`/baker/${baker.id}`)}
              >
                {baker.name}
              </h3>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {baker.country && (
                  <Badge variant="secondary" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {baker.country}
                  </Badge>
                )}
                {baker.favorite_bread_type && (
                  <Badge variant="outline" className="text-xs">
                    <Cake className="h-3 w-3 mr-1" />
                    {baker.favorite_bread_type}
                  </Badge>
                )}
                {years !== null && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {years === 0 ? "< 1 year" : `${years}+ years`}
                  </Badge>
                )}
              </div>
              
              {baker.bio && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {baker.bio}
                </p>
              )}
            </div>

            {user && (
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                onClick={() => toggleFollow()}
                disabled={followLoading}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Discover Bakers</h1>
        </div>
        
        <p className="text-muted-foreground mb-8">
          Find and follow talented bakers from around the world. Filter by location, favourite bread type, or experience level.
        </p>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or bio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={breadTypeFilter} onValueChange={setBreadTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Bread Type" />
                </SelectTrigger>
                <SelectContent>
                  {BREAD_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-muted rounded w-1/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : bakers && bakers.length > 0 ? (
          <div className="grid gap-4">
            {bakers.map(baker => (
              <BakerCard key={baker.id} baker={baker} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No bakers found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters to discover more bakers.
              </p>
            </CardContent>
          </Card>
        )}

        {bakers && bakers.length > 0 && (
          <p className="text-center text-muted-foreground mt-6">
            Showing {bakers.length} baker{bakers.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>
    </div>
  );
};

export default DiscoverBakers;
