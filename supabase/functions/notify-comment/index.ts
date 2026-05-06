import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyCommentRequest {
  commenterId: string;
  bakeShareId: string;
  bakeOwnerId: string;
  commentPreview: string;
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
    const { commenterId, bakeShareId, commentPreview }: NotifyCommentRequest = await req.json();

    // Ensure the caller is the commenter
    if (authenticatedUserId !== commenterId) {
      return new Response(JSON.stringify({ error: "Forbidden: identity mismatch" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify the bake share exists and resolve the true owner server-side
    const { data: share, error: shareError } = await supabase
      .from("bake_shares")
      .select("user_id")
      .eq("id", bakeShareId)
      .single();

    if (shareError || !share) {
      return new Response(JSON.stringify({ error: "Bake share not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const bakeOwnerId = share.user_id;

    // Don't notify if user commented on their own bake
    if (commenterId === bakeOwnerId) {
      return new Response(
        JSON.stringify({ message: "User commented on their own bake, no notification needed" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get commenter's profile name
    const { data: commenterProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", commenterId)
      .single();

    if (!commenterProfile) {
      return new Response(
        JSON.stringify({ error: "Commenter not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Truncate comment for message
    const truncatedComment = commentPreview.length > 50 
      ? commentPreview.substring(0, 50) + "..." 
      : commentPreview;

    // Store notification in database
    await supabase.from("notifications").insert({
      user_id: bakeOwnerId,
      type: "comment",
      actor_id: commenterId,
      content_id: bakeShareId,
      message: `${commenterProfile.name} commented: "${truncatedComment}"`,
    });

    // Check if owner has push enabled
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("push_enabled")
      .eq("user_id", bakeOwnerId)
      .single();

    if (!preferences?.push_enabled) {
      return new Response(
        JSON.stringify({ message: "Notification stored, push not enabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get push subscription
    const { data: subscription } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", bakeOwnerId)
      .single();

    if (!subscription) {
      return new Response(
        JSON.stringify({ message: "No push subscription found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send push notification
    const payload = JSON.stringify({
      title: `${commenterProfile.name} commented on your bake! 💬`,
      body: truncatedComment,
      icon: "/favicon.ico",
      tag: "comment",
      data: { url: `/share` },
    });

    try {
      const response = await fetch(subscription.endpoint, {
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
          .eq("id", subscription.id);
      }
    } catch (error) {
      console.error("Failed to send push notification:", error);
    }

    return new Response(
      JSON.stringify({ message: "Notification sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-comment:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
