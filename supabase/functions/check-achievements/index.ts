import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Badge definitions
const BADGES = {
  first_bake: {
    name: "First Bake",
    description: "Completed your very first bake",
    icon: "🎂",
    check: (stats: any) => stats.totalBakes >= 1,
  },
  basics_master: {
    name: "Basics Master",
    description: "Mastered the fundamentals of gluten-free baking",
    icon: "📚",
    check: (stats: any) => stats.basicsTutorialsCompleted >= 3 || stats.easyBakesCompleted >= 5,
  },
  technique_explorer: {
    name: "Technique Explorer",
    description: "Explored various baking techniques",
    icon: "🔬",
    check: (stats: any) => stats.techniquesTutorialsViewed >= 3 || stats.differentPremixesBaked >= 3,
  },
  troubleshooting_pro: {
    name: "Troubleshooting Pro",
    description: "Learned to identify and solve baking issues",
    icon: "🔧",
    check: (stats: any) => stats.troubleshootingTutorialsCompleted >= 2,
  },
  rising_star: {
    name: "Rising Star",
    description: "Achieved 5 bakes with a rating of 4 or higher",
    icon: "⭐",
    check: (stats: any) => stats.highRatedBakes >= 5,
  },
  gluten_free_champion: {
    name: "Gluten-Free Champion",
    description: "Completed 10 successful gluten-free bakes",
    icon: "🏆",
    check: (stats: any) => stats.successfulBakes >= 10,
  },
  learning_pioneer: {
    name: "Learning Pioneer",
    description: "Started your personalised learning journey",
    icon: "🧭",
    check: (stats: any) => stats.tutorialsViewed >= 1,
  },
  consistency_king: {
    name: "Consistency Royalty",
    description: "Achieved 5 consecutive successful bakes",
    icon: "👑",
    check: (stats: any) => stats.consecutiveSuccesses >= 5,
  },
  advanced_baker: {
    name: "Advanced Baker",
    description: "Successfully completed advanced difficulty bakes",
    icon: "🎓",
    check: (stats: any) => stats.advancedBakesCompleted >= 3,
  },
  community_contributor: {
    name: "Community Contributor",
    description: "Shared your bakes with the community",
    icon: "🤝",
    check: (stats: any) => stats.bakesShared >= 3,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Gather all stats needed for badge checks
    const [
      bakingSessionsResult,
      existingAchievementsResult,
      bakeSharesResult,
      tutorialsResult,
    ] = await Promise.all([
      supabaseService
        .from("baking_sessions")
        .select("*, premixes(difficulty)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabaseService
        .from("user_achievements")
        .select("badge_type")
        .eq("user_id", user.id),
      supabaseService
        .from("bake_shares")
        .select("id")
        .eq("user_id", user.id),
      supabaseService
        .from("tutorials")
        .select("id, category"),
    ]);

    const bakingSessions = bakingSessionsResult.data || [];
    const existingBadges = new Set((existingAchievementsResult.data || []).map(a => a.badge_type));
    const bakeShares = bakeSharesResult.data || [];
    const tutorials = tutorialsResult.data || [];

    // Calculate stats
    const totalBakes = bakingSessions.length;
    const successfulBakes = bakingSessions.filter(s => s.success_rating && s.success_rating >= 3).length;
    const highRatedBakes = bakingSessions.filter(s => s.success_rating && s.success_rating >= 4).length;
    const easyBakesCompleted = bakingSessions.filter(s => s.premixes?.difficulty === 'Easy').length;
    const advancedBakesCompleted = bakingSessions.filter(s => s.premixes?.difficulty === 'Advanced').length;
    
    // Calculate consecutive successes
    let consecutiveSuccesses = 0;
    let maxConsecutive = 0;
    for (const session of bakingSessions) {
      if (session.success_rating && session.success_rating >= 4) {
        consecutiveSuccesses++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveSuccesses);
      } else {
        consecutiveSuccesses = 0;
      }
    }

    // Get unique premixes baked
    const differentPremixesBaked = new Set(bakingSessions.map(s => s.premix_id)).size;

    // Tutorial stats (simplified - count categories as "viewed" if user has bakes)
    const basicsTutorialsCompleted = tutorials.filter(t => t.category?.toLowerCase() === 'basics').length > 0 && totalBakes >= 3 ? 3 : 0;
    const techniquesTutorialsViewed = tutorials.filter(t => t.category?.toLowerCase() === 'techniques').length > 0 && totalBakes >= 2 ? 3 : 0;
    const troubleshootingTutorialsCompleted = tutorials.filter(t => t.category?.toLowerCase() === 'troubleshooting').length > 0 && totalBakes >= 5 ? 2 : 0;
    const tutorialsViewed = tutorials.length > 0 ? 1 : 0;

    const stats = {
      totalBakes,
      successfulBakes,
      highRatedBakes,
      easyBakesCompleted,
      advancedBakesCompleted,
      consecutiveSuccesses: maxConsecutive,
      differentPremixesBaked,
      basicsTutorialsCompleted,
      techniquesTutorialsViewed,
      troubleshootingTutorialsCompleted,
      tutorialsViewed,
      bakesShared: bakeShares.length,
    };

    // Check for new badges to award
    const newBadges: Array<{
      badge_type: string;
      badge_name: string;
      badge_description: string;
      badge_icon: string;
    }> = [];

    for (const [badgeType, badge] of Object.entries(BADGES)) {
      if (!existingBadges.has(badgeType) && badge.check(stats)) {
        newBadges.push({
          badge_type: badgeType,
          badge_name: badge.name,
          badge_description: badge.description,
          badge_icon: badge.icon,
        });
      }
    }

    // Award new badges
    if (newBadges.length > 0) {
      const inserts = newBadges.map(badge => ({
        user_id: user.id,
        badge_type: badge.badge_type,
        badge_name: badge.badge_name,
        badge_description: badge.badge_description,
        badge_icon: badge.badge_icon,
      }));

      const { error: insertError } = await supabaseService
        .from("user_achievements")
        .insert(inserts);

      if (insertError) {
        console.error("Error inserting badges:", insertError);
      }
    }

    // Fetch all user achievements
    const { data: allAchievements } = await supabaseService
      .from("user_achievements")
      .select("*")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false });

    // Return all badges with earned status
    const allBadges = Object.entries(BADGES).map(([type, badge]) => {
      const earned = allAchievements?.find(a => a.badge_type === type);
      return {
        type,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earned: !!earned,
        earnedAt: earned?.earned_at || null,
      };
    });

    return new Response(
      JSON.stringify({
        achievements: allAchievements || [],
        allBadges,
        newlyEarned: newBadges,
        stats,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in check-achievements:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
