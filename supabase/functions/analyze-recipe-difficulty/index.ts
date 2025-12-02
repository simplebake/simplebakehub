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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  const endpoint = 'analyze-recipe-difficulty';

  try {
    // Rate limiting: 60 requests per hour per IP
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);
    
    const { data: rateLimitData } = await supabase
      .from('rate_limits')
      .select('request_count')
      .eq('ip_address', clientIP)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .single();

    if (rateLimitData && rateLimitData.request_count >= 60) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
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

    const { recipeText } = await req.json();
    
    if (!recipeText || typeof recipeText !== 'string' || recipeText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Recipe text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (recipeText.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Recipe text must be less than 5000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert culinary instructor and recipe analyst with decades of experience teaching baking and cooking. Your role is to evaluate recipe difficulty with precision and provide actionable insights. Always use British English spelling (e.g., flavour, colour, specialised, recognise).

When analysing a recipe, consider these factors:
1. Technical Skills Required: knife work, temperature control, timing precision, special techniques
2. Equipment Complexity: specialised tools, multiple appliances, equipment familiarity
3. Ingredient Accessibility: common vs speciality ingredients, preparation complexity
4. Time Investment: active cooking time, waiting/resting periods, multi-day processes
5. Precision Requirements: measurements, temperatures, timing sensitivity
6. Multi-tasking: simultaneous processes, coordination of steps
7. Failure Risk: what can go wrong, how forgiving is the recipe

Provide your analysis in this exact JSON format:
{
  "difficulty": "Easy" | "Medium" | "Hard" | "Expert",
  "difficultyScore": 1-10,
  "reasoning": "2-3 sentence overview of why this difficulty level",
  "keyFactors": [
    "Factor 1: specific challenge or ease",
    "Factor 2: specific challenge or ease",
    "Factor 3: specific challenge or ease"
  ],
  "timeEstimate": "X hours Y minutes",
  "skillsRequired": ["skill1", "skill2", "skill3"],
  "recommendedFor": "Beginner/Intermediate/Advanced home cook",
  "tips": "One helpful tip to make this easier"
}`;

    const userPrompt = `Analyze this recipe and provide a detailed difficulty assessment:\n\n${recipeText}`;

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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;

    // Parse AI response
    let analysis;
    try {
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || aiContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      // Fallback response
      analysis = {
        difficulty: "Medium",
        difficultyScore: 5,
        reasoning: "Unable to fully analyze the recipe. Please ensure it includes ingredients and instructions.",
        keyFactors: ["Analysis incomplete"],
        timeEstimate: "Unknown",
        skillsRequired: ["Basic cooking knowledge"],
        recommendedFor: "Intermediate home cook",
        tips: "Review the recipe format and try again"
      };
    }

    // Update rate limit counter
    await supabase.from('rate_limits').upsert({
      ip_address: clientIP,
      endpoint: endpoint,
      window_start: windowStart.toISOString(),
      request_count: (rateLimitData?.request_count || 0) + 1
    }, {
      onConflict: 'ip_address,endpoint,window_start'
    });

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error analyzing recipe difficulty:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
