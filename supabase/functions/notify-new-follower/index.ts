import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

interface NotifyNewFollowerRequest {
  followerId: string;
  followingId: string;
}

serve(async (req) => {
  const log = createLogger("notify-new-follower", req);
  if (req.method === "OPTIONS") return log.preflight();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return log.respond({ error: "Unauthorized" }), {
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
    const { followerId, followingId }: NotifyNewFollowerRequest = await req.json();

    // Ensure the caller is the follower
    if (authenticatedUserId !== followerId) {
      return new Response(JSON.stringify({ error: "Forbidden: identity mismatch" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify the follow relationship actually exists server-side
    const { data: followRow, error: followErr } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();

    if (followErr || !followRow) {
      return new Response(JSON.stringify({ error: "Follow relationship not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get follower's profile name
    const { data: followerProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", followerId)
      .single();

    if (!followerProfile) {
      return new Response(
        JSON.stringify({ error: "Follower not found" }, { status: 404 });
    }

    // Store notification in database
    await supabase.from("notifications").insert({
      user_id: followingId,
      type: "new_follower",
      actor_id: followerId,
      message: `${followerProfile.name} started following you`,
    });

    // Check if the followed user has push notifications enabled
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("push_enabled")
      .eq("user_id", followingId)
      .single();

    if (!preferences?.push_enabled) {
      return log.respond({ message: "Notification stored, push not enabled" }, { status: 200 });
    }

    // Fetch push subscriptions for the followed user
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", followingId);

    if (!subscriptions || subscriptions.length === 0) {
      return log.respond({ message: "No push subscriptions found" }, { status: 200 });
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: "New Follower! 🎉",
      body: `${followerProfile.name} started following you`,
      icon: "/favicon.ico",
      tag: "new-follower",
      data: { url: `/baker/${followerId}` },
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

    return log.respond({ message: "Notification sent", sent: successful }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error("unhandled_exception", { error: errorMessage });
    return log.respond({ error: errorMessage }, { status: 500 });
  }
});
