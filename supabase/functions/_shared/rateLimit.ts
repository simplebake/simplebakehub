import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSeconds: number;
}

/**
 * Sliding-ish window rate limiter backed by the public.rate_limits table.
 *
 * Counts requests for `(key, endpoint)` within the current window and
 * increments the counter. If the count exceeds `limit`, the call is denied.
 *
 * `key` should be a user id when available, otherwise the client IP. The
 * value is stored in the `ip_address` column (which accepts arbitrary text).
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  endpoint: string,
  limit: number,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  try {
    // Find the most recent active window for this key+endpoint
    const { data: existing } = await supabase
      .from("rate_limits")
      .select("id, request_count, window_start")
      .eq("ip_address", key)
      .eq("endpoint", endpoint)
      .gte("window_start", windowStart.toISOString())
      .order("window_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const newCount = (existing.request_count ?? 0) + 1;
      await supabase
        .from("rate_limits")
        .update({ request_count: newCount })
        .eq("id", existing.id);

      const allowed = newCount <= limit;
      const winStartMs = new Date(existing.window_start).getTime();
      const retryAfterSeconds = allowed
        ? 0
        : Math.max(1, Math.ceil((winStartMs + windowSeconds * 1000 - now.getTime()) / 1000));

      return { allowed, count: newCount, limit, retryAfterSeconds };
    }

    // No active window — create a new one
    await supabase.from("rate_limits").insert({
      ip_address: key,
      endpoint,
      request_count: 1,
      window_start: now.toISOString(),
    });

    return { allowed: true, count: 1, limit, retryAfterSeconds: 0 };
  } catch (err) {
    // Fail-open on storage errors so a transient DB issue doesn't break
    // legitimate traffic; the failure is logged by the caller via logger.
    console.error("rate_limit_check_failed", err);
    return { allowed: true, count: 0, limit, retryAfterSeconds: 0 };
  }
}

/** Best-effort client IP from common proxy headers. */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")
    ?? req.headers.get("cf-connecting-ip")
    ?? "unknown";
}