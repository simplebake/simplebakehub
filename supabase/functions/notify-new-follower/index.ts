import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { checkRateLimit, getClientIp } from "../_shared/rateLimit.ts";

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

    // Rate limit: 20 new-follower notifications per minute per user.
    const rl = await checkRateLimit(
      supabase,
      authenticatedUserId,
      "notify-new-follower",
      20,
      60,
    );
    if (!rl.allowed) {
      reqLog.warn("rate_limited", { count: rl.count, limit: rl.limit, ip: getClientIp(req) });
      return log.respond(
        { error: "Too many requests", retryAfterSeconds: rl.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const { followerId, followingId }: NotifyNewFollowerRequest = await req.json();

    if (authenticatedUserId !== followerId) {
      reqLog.warn("identity_mismatch", { claimedFollowerId: followerId });
      return log.respond({ error: "Forbidden: identity mismatch" }, { status: 403 });
    }

    const { data: followRow, error: followErr } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();

    if (followErr || !followRow) {
      reqLog.warn("follow_not_found", { followingId });
      return log.respond({ error: "Follow relationship not found" }, { status: 404 });
    }

    const { data: followerProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", followerId)
      .single();

    if (!followerProfile) {
      reqLog.warn("follower_profile_not_found");
      return log.respond({ error: "Follower not found" }, { status: 404 });
    }

    await supabase.from("notifications").insert({
      user_id: followingId,
      type: "new_follower",
      actor_id: followerId,
      message: `${followerProfile.name} started following you`,
    });
    reqLog.info("notification_stored", { recipientId: followingId });

    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("push_enabled")
      .eq("user_id", followingId)
      .single();

    if (!preferences?.push_enabled) {
      reqLog.debug("push_disabled");
      return log.respond({ message: "Notification stored, push not enabled" }, { status: 200 });
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", followingId);

    if (!subscriptions || subscriptions.length === 0) {
      reqLog.debug("no_push_subscriptions");
      return log.respond({ message: "No push subscriptions found" }, { status: 200 });
    }

    const payload = JSON.stringify({
      title: "New Follower! 🎉",
      body: `${followerProfile.name} started following you`,
      icon: "/favicon.ico",
      tag: "new-follower",
      data: { url: `/baker/${followerId}`, correlationId: log.correlationId },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", TTL: "86400" },
            body: payload,
          });

          if (!response.ok && (response.status === 404 || response.status === 410)) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }

          return { success: response.ok };
        } catch (error) {
          reqLog.warn("push_send_failed", {
            subscriptionId: sub.id,
            error: error instanceof Error ? error.message : String(error),
          });
          return { success: false };
        }
      }),
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && (r.value as { success: boolean }).success,
    ).length;
    reqLog.info("push_dispatched", { sent: successful, total: subscriptions.length });

    return log.respond({ message: "Notification sent", sent: successful }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error("unhandled_exception", { error: errorMessage });
    return log.respond({ error: errorMessage }, { status: 500 });
  }
});
