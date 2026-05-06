import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { checkRateLimit, getClientIp } from "../_shared/rateLimit.ts";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
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
    
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

function isTimestampValid(timestamp: string | null, toleranceSeconds = 300): boolean {
  if (!timestamp) return true; // If no timestamp provided, skip validation
  
  try {
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    const diff = Math.abs(now - webhookTime);
    
    // Reject if timestamp is more than 5 minutes old (prevents replay attacks)
    return diff <= toleranceSeconds * 1000;
  } catch {
    console.warn("Invalid timestamp format:", timestamp);
    return false;
  }
}

serve(async (req) => {
  const log = createLogger("incoming-webhook", req);
  if (req.method === 'OPTIONS') return log.preflight();

  const startTime = Date.now();
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Rate limit: 120 incoming webhook calls per minute per source IP.
  const ip = getClientIp(req);
  const rl = await checkRateLimit(supabaseClient, ip, "incoming-webhook", 120, 60);
  if (!rl.allowed) {
    log.warn("rate_limited", { ip, count: rl.count, limit: rl.limit });
    return log.respond(
      { error: "Too many requests", retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let responseStatus = 200;
  let responseBody: Record<string, unknown> = {};
  let success = false;
  let errorMessage: string | null = null;

  try {
    // Get the raw body
    const rawBody = await req.text();
    const payload = rawBody ? JSON.parse(rawBody) : {};
    
    const SENSITIVE_HEADERS_LOG = new Set([
      'authorization', 'x-api-key', 'cookie', 'set-cookie',
      'x-webhook-signature', 'apikey',
    ]);
    const safeLogHeaders = Object.fromEntries(
      [...req.headers.entries()].filter(([k]) => !SENSITIVE_HEADERS_LOG.has(k.toLowerCase()))
    );
    log.info("incoming_received", {
      method: req.method,
      headers: safeLogHeaders,
      payloadPreview: rawBody.substring(0, 500),
    });

    // Extract headers
    const signature = req.headers.get('x-webhook-signature');
    const timestamp = req.headers.get('x-webhook-timestamp');
    const eventType = payload.event || payload.type || 'unknown';

    // Find a webhook config to verify against (check all active configs)
    const { data: configs, error: configError } = await supabaseClient
      .from('webhook_configs')
      .select('*')
      .eq('is_enabled', true);

    if (configError) {
      log.error("config_fetch_failed", { error: configError.message });
    }

    // Validate timestamp to prevent replay attacks
    if (!isTimestampValid(timestamp)) {
      log.warn("timestamp_invalid");
      responseStatus = 401;
      responseBody = { error: "Timestamp expired or invalid" };
      errorMessage = "Webhook timestamp expired";
      throw new Error("Timestamp expired");
    }

    // Verify signature if provided and configs exist
    let signatureValid = true;
    let signatureRequired = false;
    
    if (configs && configs.length > 0) {
      // Check if any config has a secret (making signature verification required)
      signatureRequired = configs.some(c => c.secret_key && c.secret_key.length > 0);
    }

    if (signatureRequired) {
      if (!signature) {
        log.warn("signature_missing");
        responseStatus = 401;
        responseBody = { error: "Missing signature", hint: "Include X-Webhook-Signature header" };
        errorMessage = "Missing webhook signature";
        throw new Error("Missing signature");
      }

      signatureValid = false;
      for (const config of configs!) {
        if (config.secret_key && await verifySignature(rawBody, signature, config.secret_key)) {
          signatureValid = true;
          log.info("signature_verified", { configId: config.id });
          break;
        }
      }
      
      if (!signatureValid) {
        log.warn("signature_invalid");
        responseStatus = 401;
        responseBody = { error: "Invalid signature" };
        errorMessage = "Invalid webhook signature";
        throw new Error("Invalid signature");
      }
    }

    log.info("event_processing", { eventType });
    
    // Handle different event types
    log.debug("event_payload", { eventType, payloadPreview: JSON.stringify(payload).slice(0, 500) });

    success = true;
    responseBody = {
      success: true,
      message: "Webhook received and processed",
      eventType,
      timestamp: new Date().toISOString(),
      correlationId: log.correlationId,
    };

  } catch (error: unknown) {
    log.error("processing_failed", { error: error instanceof Error ? error.message : String(error) });
    success = false;
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (responseStatus === 200) {
      responseStatus = 500;
      responseBody = { error: "Internal server error" };
    }
  }

  const duration = Date.now() - startTime;

  // Log the webhook call
  try {
    const SENSITIVE_HEADERS = new Set([
      'authorization',
      'x-api-key',
      'cookie',
      'set-cookie',
      'x-webhook-signature',
      'apikey',
    ]);
    const safeHeaders = Object.fromEntries(
      [...req.headers.entries()].filter(([k]) => !SENSITIVE_HEADERS.has(k.toLowerCase()))
    );
    await supabaseClient.from('webhook_logs').insert({
      integration_id: 'custom-webhook',
      direction: 'incoming',
      endpoint_url: req.url,
      method: req.method,
      request_headers: safeHeaders,
      request_payload: responseBody,
      response_status: responseStatus,
      response_body: responseBody,
      duration_ms: duration,
      success,
      error_message: errorMessage,
    });
  } catch (logError) {
    log.error("audit_log_failed", { error: logError instanceof Error ? logError.message : String(logError) });
  }

  return log.respond(responseBody, { status: responseStatus });
});
