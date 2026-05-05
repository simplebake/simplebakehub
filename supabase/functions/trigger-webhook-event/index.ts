import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, isAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAuth(req);
  if ("response" in auth) return auth.response;
  const admin = await isAdmin(auth.userId);

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { event, data } = await req.json();

    if (!event) {
      return new Response(
        JSON.stringify({ error: "Event type is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Triggering webhook event: ${event}`, data);

    // Get active webhook configurations subscribed to this event
    // Non-admins are restricted to their own configs
    let cfgQ = supabaseClient
      .from('webhook_configs')
      .select('*')
      .eq('is_enabled', true)
      .contains('subscribed_events', [event]);
    if (!admin) cfgQ = cfgQ.eq('user_id', auth.userId);
    const { data: configs, error: configError } = await cfgQ;

    if (configError) {
      console.error("Error fetching configs:", configError);
      throw configError;
    }

    if (!configs || configs.length === 0) {
      // Also check configs with empty subscribed_events (subscribed to all)
      let allQ = supabaseClient
        .from('webhook_configs')
        .select('*')
        .eq('is_enabled', true)
        .or('subscribed_events.is.null,subscribed_events.eq.{}');
      if (!admin) allQ = allQ.eq('user_id', auth.userId);
      const { data: allEventConfigs } = await allQ;

      if (!allEventConfigs || allEventConfigs.length === 0) {
        console.log(`No webhooks subscribed to event: ${event}`);
        return new Response(
          JSON.stringify({ success: true, message: "No webhooks subscribed to this event" }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Call send-webhook function
    const { data: sendResult, error: sendError } = await supabaseClient.functions.invoke(
      'send-webhook',
      {
        body: { event, data },
        headers: { Authorization: `Bearer ${auth.token}` },
      }
    );

    if (sendError) {
      console.error("Error sending webhooks:", sendError);
      throw sendError;
    }

    console.log("Webhook event triggered successfully:", sendResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Event ${event} triggered`,
        results: sendResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Trigger webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
