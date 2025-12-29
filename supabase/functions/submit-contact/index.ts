import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit: 3 submissions per hour per IP
const RATE_LIMIT = 3;
const RATE_LIMIT_WINDOW_HOURS = 1;

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  subject: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  message: z.string().min(1).max(2000),
  userId: z.string().uuid().optional().nullable(),
});

// ============ IP Blocking Utilities ============

interface BlockedIPCheck {
  isBlocked: boolean;
  reason?: string;
  expiresAt?: string;
}

async function checkIPBlocked(
  supabase: SupabaseClient,
  ipAddress: string
): Promise<BlockedIPCheck> {
  try {
    await supabase.rpc('cleanup_expired_blocks');

    const { data, error } = await supabase
      .from('blocked_ips')
      .select('reason, expires_at')
      .eq('ip_address', ipAddress)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error checking blocked IP:', error);
      return { isBlocked: false };
    }

    if (data) {
      return {
        isBlocked: true,
        reason: data.reason,
        expiresAt: data.expires_at
      };
    }

    return { isBlocked: false };
  } catch (error) {
    console.error('Error in checkIPBlocked:', error);
    return { isBlocked: false };
  }
}

async function autoBlockIPForRateLimit(
  supabase: SupabaseClient,
  ipAddress: string,
  endpoint: string,
  violationCount: number
): Promise<void> {
  try {
    const { data: existingBlock } = await supabase
      .from('blocked_ips')
      .select('id, is_active')
      .eq('ip_address', ipAddress)
      .maybeSingle();

    if (existingBlock?.is_active) {
      await supabase
        .from('blocked_ips')
        .update({ violation_count: violationCount })
        .eq('id', existingBlock.id);
      return;
    }

    let blockDurationHours = 24;
    if (violationCount >= 5) {
      blockDurationHours = 168; // 7 days
    } else if (violationCount >= 3) {
      blockDurationHours = 72; // 3 days
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + blockDurationHours);

    const { error: insertError } = await supabase
      .from('blocked_ips')
      .insert({
        ip_address: ipAddress,
        reason: `Automatic block: ${violationCount} rate limit violations on ${endpoint} endpoint`,
        auto_blocked: true,
        violation_count: violationCount,
        expires_at: expiresAt.toISOString(),
        is_active: true
      });

    if (insertError) {
      console.error('Error auto-blocking IP:', insertError);
    } else {
      console.log(`Auto-blocked IP ${ipAddress} for ${blockDurationHours} hours after ${violationCount} violations`);
      
      await supabase.from('audit_logs').insert({
        event_type: 'security_ip_blocked',
        ip_address: ipAddress,
        endpoint: endpoint,
        details: {
          auto_blocked: true,
          violation_count: violationCount,
          block_duration_hours: blockDurationHours,
          reason: 'rate_limit_violations'
        }
      });
    }
  } catch (error) {
    console.error('Error in autoBlockIPForRateLimit:', error);
  }
}

async function checkAndAutoBlock(
  supabase: SupabaseClient,
  ipAddress: string,
  endpoint: string
): Promise<void> {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const { data: violations, error } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('ip_address', ipAddress)
      .gte('request_count', RATE_LIMIT)
      .gte('window_start', oneDayAgo.toISOString());

    if (error) {
      console.error('Error checking violations:', error);
      return;
    }

    if (violations && violations.length >= 3) {
      await autoBlockIPForRateLimit(supabase, ipAddress, endpoint, violations.length);
    }
  } catch (error) {
    console.error('Error in checkAndAutoBlock:', error);
  }
}

// ============ Security Pattern Detection ============

const dangerousPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:\s*text\/html/gi,
];

const sqlPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
  /(--|\/\*|\*\/|;)/g,
];

function containsDangerousContent(text: string): boolean {
  for (const pattern of dangerousPatterns) {
    if (pattern.test(text)) return true;
  }
  for (const pattern of sqlPatterns) {
    if (pattern.test(text)) return true;
  }
  return false;
}

function sanitizeInput(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    console.log(`Contact form submission from IP: ${clientIP}`);

    // Check if IP is blocked
    const blockCheck = await checkIPBlocked(supabase, clientIP);
    if (blockCheck.isBlocked) {
      console.log(`Blocked IP attempted access: ${clientIP}`);
      
      await supabase.from('audit_logs').insert({
        event_type: 'blocked_ip_access_attempt',
        ip_address: clientIP,
        endpoint: 'submit-contact',
        details: { reason: blockCheck.reason, expires_at: blockCheck.expiresAt }
      });

      return new Response(
        JSON.stringify({ 
          error: 'Access denied. Your IP has been temporarily blocked.',
          reason: blockCheck.reason,
          expiresAt: blockCheck.expiresAt
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('ip_address', clientIP)
      .eq('endpoint', 'submit-contact')
      .gte('window_start', oneHourAgo)
      .maybeSingle();

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    const currentCount = rateLimitData?.request_count || 0;

    if (currentCount >= RATE_LIMIT) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      
      await supabase.from('audit_logs').insert({
        event_type: 'rate_limit_exceeded',
        ip_address: clientIP,
        endpoint: 'submit-contact',
        details: { count: currentCount, limit: RATE_LIMIT }
      });

      // Check for repeated violations and auto-block if needed
      await checkAndAutoBlock(supabase, clientIP, 'submit-contact');

      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: RATE_LIMIT_WINDOW_HOURS * 60 * 60
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(RATE_LIMIT_WINDOW_HOURS * 60 * 60) }
        }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = contactSchema.safeParse(body);

    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, email, subject, category, message, userId } = validationResult.data;

    // Check for dangerous content
    if (containsDangerousContent(subject) || containsDangerousContent(message)) {
      console.log(`Dangerous content detected from IP: ${clientIP}`);
      
      await supabase.from('audit_logs').insert({
        event_type: 'malicious_content_blocked',
        ip_address: clientIP,
        endpoint: 'submit-contact',
        details: { reason: 'Dangerous patterns detected' }
      });

      return new Response(
        JSON.stringify({ error: 'Invalid content detected. Please remove any special characters or code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedSubject = sanitizeInput(subject);
    const sanitizedMessage = sanitizeInput(message);

    // Insert the message
    const { data: messageData, error: insertError } = await supabase
      .from('customer_messages')
      .insert({
        subject: sanitizedSubject,
        category,
        message: sanitizedMessage,
        email,
        user_id: userId || null,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert message:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit message. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update rate limit counter
    if (rateLimitData) {
      await supabase
        .from('rate_limits')
        .update({ request_count: currentCount + 1 })
        .eq('ip_address', clientIP)
        .eq('endpoint', 'submit-contact');
    } else {
      await supabase
        .from('rate_limits')
        .insert({
          ip_address: clientIP,
          endpoint: 'submit-contact',
          request_count: 1,
          window_start: new Date().toISOString()
        });
    }

    // Log successful submission
    await supabase.from('audit_logs').insert({
      event_type: 'contact_form_submitted',
      ip_address: clientIP,
      endpoint: 'submit-contact',
      user_id: userId || null,
      details: { messageId: messageData.id, category }
    });

    console.log(`Contact form submitted successfully: ${messageData.id}`);

    return new Response(
      JSON.stringify({ success: true, messageId: messageData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
