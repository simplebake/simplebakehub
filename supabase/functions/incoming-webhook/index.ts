import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp',
};

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
    
    return signature === expectedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let responseStatus = 200;
  let responseBody: Record<string, unknown> = {};
  let success = false;
  let errorMessage: string | null = null;

  try {
    // Get the raw body
    const rawBody = await req.text();
    const payload = rawBody ? JSON.parse(rawBody) : {};
    
    console.log("Incoming webhook received:", {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
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
      console.error("Error fetching webhook configs:", configError);
    }

    // Verify signature if provided and configs exist
    let signatureValid = true;
    if (signature && configs && configs.length > 0) {
      signatureValid = false;
      for (const config of configs) {
        if (await verifySignature(rawBody, signature, config.secret_key)) {
          signatureValid = true;
          break;
        }
      }
      
      if (!signatureValid) {
        console.warn("Invalid webhook signature");
        responseStatus = 401;
        responseBody = { error: "Invalid signature" };
        errorMessage = "Invalid webhook signature";
        throw new Error("Invalid signature");
      }
    }

    // Process the webhook based on event type
    console.log(`Processing webhook event: ${eventType}`);
    
    // Handle different event types
    switch (eventType) {
      case 'bake.created':
      case 'bake.completed':
      case 'order.placed':
      case 'user.signup':
        console.log(`Received ${eventType} event:`, payload);
        break;
      default:
        console.log(`Received unknown event type: ${eventType}`, payload);
    }

    success = true;
    responseBody = {
      success: true,
      message: "Webhook received and processed",
      eventType,
      timestamp: new Date().toISOString(),
    };

  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
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
    await supabaseClient.from('webhook_logs').insert({
      integration_id: 'custom-webhook',
      direction: 'incoming',
      endpoint_url: req.url,
      method: req.method,
      request_headers: Object.fromEntries(req.headers.entries()),
      request_payload: responseBody,
      response_status: responseStatus,
      response_body: responseBody,
      duration_ms: duration,
      success,
      error_message: errorMessage,
    });
  } catch (logError) {
    console.error("Failed to log webhook:", logError);
  }

  return new Response(JSON.stringify(responseBody), {
    status: responseStatus,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
