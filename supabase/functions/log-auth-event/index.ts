import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventType, userId, details } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Map event types to standardized strings
    const eventMapping: Record<string, string> = {
      'signup': 'authentication_signup',
      'signin': 'authentication_signin',
      'signout': 'authentication_signout',
      'password_reset': 'authentication_password_reset',
      'email_verification': 'authentication_email_verification'
    };

    const mappedEventType = eventMapping[eventType] || 'authentication_other';

    // Insert audit log
    const { error } = await supabase.from('audit_logs').insert({
      event_type: mappedEventType,
      user_id: userId || null,
      ip_address: clientIP,
      endpoint: 'auth',
      details: {
        ...details,
        event: eventType,
        timestamp: new Date().toISOString()
      }
    });

    if (error) {
      console.error('Error logging auth event:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in log-auth-event:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
