import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  timeoutSeconds: number
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { event, data, config_id } = await req.json();

    console.log("Send webhook request:", { event, config_id, dataPreview: JSON.stringify(data).substring(0, 200) });

    // Get webhook configurations
    let configQuery = supabaseClient
      .from('webhook_configs')
      .select('*')
      .eq('is_enabled', true);

    if (config_id) {
      configQuery = configQuery.eq('id', config_id);
    }

    const { data: configs, error: configError } = await configQuery;

    if (configError) {
      console.error("Error fetching webhook configs:", configError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch webhook configurations" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!configs || configs.length === 0) {
      console.log("No active webhook configurations found");
      return new Response(
        JSON.stringify({ success: true, message: "No webhooks configured" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        console.log(`Config ${config.id} not subscribed to event ${event}`);
        continue;
      }

      if (!config.outgoing_url) {
        console.log(`Config ${config.id} has no outgoing URL`);
        continue;
      }

      const payload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        source: 'bakeassist',
      };

      console.log(`Sending webhook to ${config.outgoing_url}`);

      const result = await sendWebhookWithRetry(
        config.outgoing_url,
        payload,
        config.secret_key,
        config.retry_count || 3,
        config.timeout_seconds || 30
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

      results.push({
        config_id: config.id,
        success: result.success,
        status: result.status,
        error: result.error,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Send webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
