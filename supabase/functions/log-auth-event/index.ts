import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkIPBlocked, checkAndAutoBlock } from '../_shared/ipBlocking.ts';
import { requireAuth } from "../_shared/auth.ts";
import { createLogger } from "../_shared/logger.ts";

const requestSchema = z.object({
  eventType: z.enum(['signup', 'signin', 'signout', 'password_reset', 'email_verification']),
  userId: z.string().uuid().optional(),
  details: z.record(z.unknown()).optional(),
});

serve(async (req) => {
  const log = createLogger("log-auth-event", req);
  if (req.method === "OPTIONS") return log.preflight();

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  const endpoint = 'log-auth-event';
  const reqLog = log.child({ ip: clientIP });

  try {
    // Require a valid Supabase JWT — except for the 'signin' event which
    // can be logged just before a session exists. For unauthenticated calls
    // we still ignore any client-supplied userId.
    const auth = await requireAuth(req);
    let authedUserId: string | null = null;
    if (!("response" in auth)) {
      authedUserId = auth.userId;
    }

    // Check if IP is blocked
    const blockCheck = await checkIPBlocked(supabase, clientIP);
    if (blockCheck.isBlocked) {
      reqLog.warn("ip_blocked", { reason: blockCheck.reason });
      return log.respond(
        {
          error: "Access denied. Your IP address has been blocked.",
          reason: blockCheck.reason,
          expires_at: blockCheck.expiresAt,
        },
        { status: 403 },
      );
    }

    // Rate limiting: 60 requests per hour per IP
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);
    
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .from('rate_limits')
      .select('request_count')
      .eq('ip_address', clientIP)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .maybeSingle();

    if (rateLimitData && rateLimitData.request_count >= 60) {
      reqLog.warn("rate_limit_exceeded");
      
      // Check for repeat violations and auto-block if needed
      await checkAndAutoBlock(supabase, clientIP, endpoint);
      
      return log.respond(
        { error: "Rate limit exceeded. Maximum 60 requests per hour." },
        { status: 429 },
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      reqLog.warn("validation_error", { issues: validationResult.error.issues });
      return log.respond(
        { error: "Invalid request data", details: validationResult.error.issues },
        { status: 400 },
      );
    }

    const { eventType, userId, details } = validationResult.data;

    // If the caller is authenticated, force the user_id to their own id to
    // prevent forging entries for other users. If not authenticated, only
    // allow the 'signin'/'signup' events and drop any client-supplied userId.
    let safeUserId: string | null = authedUserId;
    if (!authedUserId) {
      if (eventType !== 'signin' && eventType !== 'signup' && eventType !== 'password_reset' && eventType !== 'email_verification') {
        reqLog.warn("unauth_event", { eventType });
        return log.respond({ error: "Unauthorized" }, { status: 401 });
      }
      safeUserId = null;
    }

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
      user_id: safeUserId,
      ip_address: clientIP,
      endpoint: 'auth',
      details: {
        ...details,
        event: eventType,
        timestamp: new Date().toISOString()
      }
    });

    if (error) {
      reqLog.error("audit_insert_failed", { error: error.message });
      throw error;
    }

    // Update rate limit counter
    if (rateLimitData) {
      await supabase
        .from('rate_limits')
        .update({ request_count: rateLimitData.request_count + 1 })
        .eq('ip_address', clientIP)
        .eq('endpoint', endpoint)
        .gte('window_start', windowStart.toISOString());
    } else {
      await supabase
        .from('rate_limits')
        .insert({
          ip_address: clientIP,
          endpoint: endpoint,
          request_count: 1,
          window_start: windowStart.toISOString()
        });
    }

    reqLog.info("auth_event_logged", { eventType, userId: safeUserId });
    return log.respond({ success: true }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    reqLog.error("unhandled_exception", { error: errorMessage });
    return log.respond({ error: errorMessage }, { status: 500 });
  }
});
