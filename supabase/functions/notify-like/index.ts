import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

interface NotifyLikeRequest {
  likerId: string;
  bakeShareId: string;
  bakeOwnerId?: string; // ignored; resolved server-side
}

serve(async (req) => {
  const log = createLogger("notify-like", req);
  if (req.method === "OPTIONS") return log.preflight();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      log.warn("auth_missing");
      return log.respond({ error: "Unauthorized" }, { status: 401 });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      log.warn("auth_invalid", { error: claimsError?.message });
      return log.respond({ error: "Unauthorized" }, { status: 401 });
    }
    const authenticatedUserId = claimsData.claims.sub;
    const reqLog = log.child({ userId: authenticatedUserId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { likerId, bakeShareId }: NotifyLikeRequest = await req.json();

    if (authenticatedUserId !== likerId) {
      reqLog.warn("identity_mismatch", { claimedLikerId: likerId });
      return log.respond({ error: "Forbidden: identity mismatch" }, { status: 403 });
    }

    const { data: share, error: shareError } = await supabase
      .from("bake_shares")
      .select("user_id")
      .eq("id", bakeShareId)
      .single();

    if (shareError || !share) {
      reqLog.warn("bake_share_not_found", { bakeShareId });
      return log.respond({ error: "Bake share not found" }, { status: 404 });
    }
    const bakeOwnerId = share.user_id;

    if (likerId === bakeOwnerId) {
      reqLog.info("self_like_skipped");
      return log.respond(
        { message: "User liked their own bake, no notification needed" },
        { status: 200 },
      );
    }

    const { data: likerProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", likerId)
      .single();

    if (!likerProfile) {
      reqLog.warn("liker_not_found");
      return log.respond({ error: "Liker not found" }, { status: 404 });
    }

    await supabase.from("notifications").insert({
      user_id: bakeOwnerId,
      type: "like",
      actor_id: likerId,
      content_id: bakeShareId,
      message: `${likerProfile.name} liked your bake`,
    });
    reqLog.info("notification_stored", { recipientId: bakeOwnerId });

    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("push_enabled")
      .eq("user_id", bakeOwnerId)
      .single();

    if (!preferences?.push_enabled) {
      reqLog.debug("push_disabled");
      return log.respond({ message: "Notification stored, push not enabled" }, { status: 200 });
    }

    const { data: subscription } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", bakeOwnerId)
      .single();

    if (!subscription) {
      reqLog.debug("no_push_subscription");
      return log.respond({ message: "No push subscription found" }, { status: 200 });
    }

    const payload = JSON.stringify({
      title: `${likerProfile.name} liked your bake! ❤️`,
      body: "Check out who's loving your creation",
      icon: "/favicon.ico",
      tag: "like",
      data: { url: `/share`, correlationId: log.correlationId },
    });

    try {
      const response = await fetch(subscription.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", TTL: "86400" },
        body: payload,
      });

      if (!response.ok && (response.status === 404 || response.status === 410)) {
        await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
        reqLog.info("push_subscription_pruned", { status: response.status });
      } else {
        reqLog.info("push_dispatched", { status: response.status });
      }
    } catch (error) {
      reqLog.warn("push_send_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return log.respond({ message: "Notification sent" }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error("unhandled_exception", { error: errorMessage });
    return log.respond({ error: errorMessage }, { status: 500 });
  }
});
