import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, isAdmin } from "../_shared/auth.ts";
import { validateOutgoingUrl } from "../_shared/urlGuard.ts";
import { createLogger } from "../_shared/logger.ts";
import { checkRateLimit, getClientIp } from "../_shared/rateLimit.ts";

async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  
  return Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sendWebhookWithRetry(
  url: string,
  payload: Record<string, unknown>,
  secret: string,
  maxRetries: number,
  timeoutSeconds: number,
  correlationId: string,
): Promise<{ success: boolean; status?: number; body?: unknown; error?: string; duration: number }> {
  const payloadString = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const signature = await generateSignature(payloadString, secret);
  
  let lastError: string | undefined;
  let lastStatus: number | undefined;
  let lastBody: unknown;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retry attempt ${attempt}, waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
          'X-Webhook-Event': payload.event as string || 'unknown',
          'X-Correlation-Id': correlationId,
          'User-Agent': 'BakeAssist-Webhooks/1.0',
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastStatus = response.status;

      try {
        lastBody = await response.json();
      } catch {
        lastBody = await response.text();
      }

      if (response.ok) {
        return {
          success: true,
          status: response.status,
          body: lastBody,
          duration: Date.now() - startTime,
        };
      }

      lastError = `HTTP ${response.status}: ${JSON.stringify(lastBody)}`;
      console.error(`Webhook failed (attempt ${attempt + 1}):`, lastError);

    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Webhook error (attempt ${attempt + 1}):`, lastError);
    }
  }

  return {
    success: false,
    status: lastStatus,
    body: lastBody,
    error: lastError,
    duration: Date.now() - startTime,
  };
}

serve(async (req) => {
  const log = createLogger("send-webhook", req);
  if (req.method === 'OPTIONS') return log.preflight();

  const auth = await requireAuth(req);
  if ("response" in auth) {
    log.warn("auth_failed");
    return auth.response;
  }
  const admin = await isAdmin(auth.userId);
  const reqLog = log.child({ userId: auth.userId, admin });

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Rate limit outgoing webhook dispatch: 60/min per user (admins higher: 300/min).
  const limit = admin ? 300 : 60;
  const rl = await checkRateLimit(supabaseClient, auth.userId, "send-webhook", limit, 60);
  if (!rl.allowed) {
    reqLog.warn("rate_limited", { count: rl.count, limit: rl.limit, ip: getClientIp(req) });
    return reqLog.respond(
      { error: "Too many requests", retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const { event, data, config_id } = await req.json();
    reqLog.info("request_received", { event, configId: config_id });

    // Get webhook configurations — non-admins are scoped to their own configs
    let configQuery = supabaseClient
      .from('webhook_configs')
      .select('*')
      .eq('is_enabled', true);

    if (config_id) {
      configQuery = configQuery.eq('id', config_id);
    }
    if (!admin) {
      configQuery = configQuery.eq('user_id', auth.userId);
    }

    const { data: configs, error: configError } = await configQuery;

    if (configError) {
      reqLog.error("config_fetch_failed", { error: configError.message });
      return reqLog.respond({ error: "Failed to fetch webhook configurations" }, { status: 500 });
    }

    if (!configs || configs.length === 0) {
      reqLog.info("no_configs");
      return reqLog.respond({ success: true, message: "No webhooks configured" }, { status: 200 });
    }

    const results: Array<{
      config_id: string;
      success: boolean;
      status?: number;
      error?: string;
    }> = [];

    // Send to all matching configurations
    for (const config of configs) {
      // Check if this config is subscribed to the event
      const subscribedEvents = config.subscribed_events || [];
      if (subscribedEvents.length > 0 && !subscribedEvents.includes(event)) {
        reqLog.debug("config_skipped_unsubscribed", { configId: config.id, event });
        continue;
      }

      if (!config.outgoing_url) {
        reqLog.debug("config_skipped_no_url", { configId: config.id });
        continue;
      }

      const urlCheck = validateOutgoingUrl(config.outgoing_url);
      if (!urlCheck.ok) {
        reqLog.warn("ssrf_blocked", { configId: config.id, reason: urlCheck.error });
        await supabaseClient.from('webhook_logs').insert({
          integration_id: 'custom-webhook',
          direction: 'outgoing',
          endpoint_url: config.outgoing_url,
          method: 'POST',
          request_payload: { event, correlationId: log.correlationId },
          response_status: 0,
          response_body: null,
          duration_ms: 0,
          success: false,
          error_message: `Blocked by SSRF guard: ${urlCheck.error}`,
        });
        results.push({
          config_id: config.id,
          success: false,
          error: urlCheck.error,
        });
        continue;
      }

      const payload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        source: 'bakeassist',
        correlationId: log.correlationId,
      };

      reqLog.info("webhook_dispatch", { configId: config.id });

      const result = await sendWebhookWithRetry(
        config.outgoing_url,
        payload,
        config.secret_key,
        config.retry_count || 3,
        config.timeout_seconds || 30,
        log.correlationId,
      );

      // Log the webhook call
      await supabaseClient.from('webhook_logs').insert({
        integration_id: 'custom-webhook',
        direction: 'outgoing',
        endpoint_url: config.outgoing_url,
        method: 'POST',
        request_payload: payload,
        response_status: result.status,
        response_body: result.body,
        duration_ms: result.duration,
        success: result.success,
        error_message: result.error,
      });
      reqLog[result.success ? "info" : "warn"]("webhook_result", {
        configId: config.id,
        success: result.success,
        status: result.status,
        durationMs: result.duration,
      });

      results.push({
        config_id: config.id,
        success: result.success,
        status: result.status,
        error: result.error,
      });
    }

    return reqLog.respond({ success: true, results }, { status: 200 });

  } catch (error: unknown) {
    reqLog.error("unhandled_exception", {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return reqLog.respond(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
});
