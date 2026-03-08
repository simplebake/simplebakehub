import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyNewBakeRequest {
  bakerId: string;
  bakeId: string;
  premixName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const authenticatedUserId = claimsData.claims.sub;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { bakerId, bakeId, premixName }: NotifyNewBakeRequest = await req.json();

    // Ensure the caller is the baker
    if (authenticatedUserId !== bakerId) {
      return new Response(JSON.stringify({ error: "Forbidden: identity mismatch" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get baker's profile name
    const { data: bakerProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", bakerId)
      .single();

    if (!bakerProfile) {
      return new Response(
        JSON.stringify({ error: "Baker not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all followers of this baker
    const { data: followers } = await supabase
      .from("followers")
      .select("follower_id")
      .eq("following_id", bakerId);

    if (!followers || followers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No followers to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const followerIds = followers.map(f => f.follower_id);

    // Store notifications in database for all followers
    const notificationRecords = followerIds.map(followerId => ({
      user_id: followerId,
      type: "new_bake",
      actor_id: bakerId,
      content_id: bakeId,
      message: `${bakerProfile.name} shared a new ${premixName || 'bake'}`,
    }));

    await supabase.from("notifications").insert(notificationRecords);

    // Get followers who have push enabled
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .in("user_id", followerIds)
      .eq("push_enabled", true);

    if (!preferences || preferences.length === 0) {
      return new Response(
        JSON.stringify({ message: "Notifications stored, no push subscribers" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const usersWithPush = preferences.map(p => p.user_id);

    // Fetch push subscriptions for these users
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", usersWithPush);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: `${bakerProfile.name} shared a new bake! 🍞`,
      body: `Check out their ${premixName || 'latest creation'}`,
      icon: "/favicon.ico",
      tag: "new-bake",
      data: { url: `/share` },
    });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "TTL": "86400",
            },
            body: payload,
          });

          if (!response.ok && (response.status === 404 || response.status === 410)) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }

          return { success: response.ok };
        } catch (error) {
          console.error(`Failed to send to subscription ${sub.id}:`, error);
          return { success: false };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;

    return new Response(
      JSON.stringify({ 
        message: "Notifications sent", 
        sent: successful, 
        total: subscriptions.length 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-new-bake:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
