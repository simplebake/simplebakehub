import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkIPBlocked, checkAndAutoBlock } from '../_shared/ipBlocking.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  context: z.enum(["guided_bake", "product_page", "home", "general"]).optional(),
  premixName: z.string().min(1).max(200).optional(),
  stepTitle: z.string().min(1).max(500).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  const endpoint = 'generate-smart-tip';

  try {
    // Check if IP is blocked
    const blockCheck = await checkIPBlocked(supabase, clientIP);
    if (blockCheck.isBlocked) {
      console.log(`Blocked IP attempt: ${clientIP}`);
      return new Response(
        JSON.stringify({ 
          error: "Access denied. Your IP address has been blocked.",
          reason: blockCheck.reason
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      .single();

    if (rateLimitData && rateLimitData.request_count >= 60) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      await checkAndAutoBlock(supabase, clientIP, endpoint);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Maximum 60 requests per hour." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      event_type: 'edge_function_invocation',
      ip_address: clientIP,
      endpoint: endpoint,
      details: { rate_limited: false }
    });

    const body = await req.json();
    
    // Validate input
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      console.error("Validation error:", validation.error.issues);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validation.error.issues 
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const { context, premixName, stepTitle, difficulty } = validation.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "You are an expert gluten-free baking assistant. Provide concise, practical tips that help bakers succeed. Always use British English spelling (e.g., flavour, colour, specialise).";
    let userPrompt = "";

    // Generate context-specific prompts
    if (context === "guided_bake" && stepTitle) {
      userPrompt = `Give a helpful, encouraging tip for this baking step: "${stepTitle}" for the "${premixName}" premix. Keep it under 50 words and make it actionable.`;
    } else if (context === "product_page" && difficulty) {
      userPrompt = `Give a quick success tip for baking with "${premixName}" (${difficulty} difficulty). Focus on what makes this premix special or easy to work with. Keep it under 40 words.`;
    } else if (context === "home") {
      userPrompt = `Give an inspiring gluten-free baking tip to motivate someone to start baking. Keep it under 40 words and make it encouraging.`;
    } else {
      userPrompt = "Give a general helpful tip about gluten-free baking. Keep it under 40 words.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const tip = data.choices[0].message.content;

    // Update rate limit counter
    await supabase.from('rate_limits').upsert({
      ip_address: clientIP,
      endpoint: endpoint,
      window_start: windowStart.toISOString(),
      request_count: (rateLimitData?.request_count || 0) + 1
    }, {
      onConflict: 'ip_address,endpoint,window_start'
    });

    return new Response(JSON.stringify({ tip }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating tip:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
