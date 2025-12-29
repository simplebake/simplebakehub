import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

// Dangerous pattern detection
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get client IP
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    console.log(`Contact form submission from IP: ${clientIP}`);

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
      
      // Log the rate limit violation
      await supabase.from('audit_logs').insert({
        event_type: 'rate_limit_exceeded',
        ip_address: clientIP,
        endpoint: 'submit-contact',
        details: { count: currentCount, limit: RATE_LIMIT }
      });

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
