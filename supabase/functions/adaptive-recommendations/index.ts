import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, premixId, currentEnvironment } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch user's baking history for this premix
    const { data: sessions, error: sessionsError } = await supabase
      .from("baking_sessions")
      .select(`
        *,
        premixes (name, water_amount, oil_amount)
      `)
      .eq("user_id", userId)
      .eq("premix_id", premixId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      throw sessionsError;
    }

    // Also get sessions from similar environmental conditions
    const { data: similarSessions, error: similarError } = await supabase
      .from("baking_sessions")
      .select("*")
      .eq("user_id", userId)
      .neq("premix_id", premixId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (similarError) {
      console.error("Error fetching similar sessions:", similarError);
    }

    // Build context for AI
    const hasHistory = sessions && sessions.length > 0;
    let historyContext = "No previous baking history for this recipe.";

    if (hasHistory) {
      const successfulBakes = sessions.filter(s => s.success_rating && s.success_rating >= 4);
      const failedBakes = sessions.filter(s => s.success_rating && s.success_rating < 3);
      
      historyContext = `User has baked this recipe ${sessions.length} times.
      
Successful bakes (${successfulBakes.length}):
${successfulBakes.map(s => `- Rating: ${s.success_rating}/5, Environment: ${s.temperature_celsius}°C, ${s.humidity_percent}% humidity, Season: ${s.season}
  Adjustments: Water: ${s.water_adjustment_ml || 0}ml, Proofing: ${s.proofing_time_adjustment_minutes || 0}min
  ${s.outcome_notes ? `Notes: ${s.outcome_notes}` : ''}`).join('\n')}

${failedBakes.length > 0 ? `Failed/problematic bakes (${failedBakes.length}):
${failedBakes.map(s => `- Rating: ${s.success_rating}/5, Environment: ${s.temperature_celsius}°C, ${s.humidity_percent}% humidity
  Issues: ${s.issues?.join(', ') || 'none recorded'}
  ${s.outcome_notes ? `Notes: ${s.outcome_notes}` : ''}`).join('\n')}` : ''}`;
    }

    // Build current environment context
    const envContext = currentEnvironment ? `
Current Environment:
- Temperature: ${currentEnvironment.temperature || 'unknown'}°C
- Humidity: ${currentEnvironment.humidity || 'unknown'}%
- Season: ${currentEnvironment.season || 'unknown'}
- Altitude: ${currentEnvironment.altitude || 'unknown'}m` : 'Current environment not provided';

    const systemPrompt = `You are an expert gluten-free baking advisor with deep knowledge of how environmental factors affect baking outcomes. You use reinforcement learning principles to adapt recipes based on user history. Always use British English spelling (e.g., flavour, colour, optimise).

Your task: Analyse the user's baking history and current environment to provide specific, actionable recipe adjustments. Focus on water ratios, proofing times, and temperatures.

Be specific with numbers (e.g., "+15ml water", "-5 minutes proofing") based on patterns in their history. If no history exists, provide general environmental guidance.`;

    const userPrompt = `${historyContext}

${envContext}

Based on this data, provide specific recipe adjustments for today's bake. Format your response as:

WATER: [adjustment in ml with reasoning]
PROOFING: [time adjustment with reasoning]
TEMPERATURE: [temp adjustment with reasoning]
KEY INSIGHT: [One personalized tip based on their history]

Keep each section concise (1-2 sentences).`;

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
    const recommendations = data.choices[0].message.content;

    return new Response(
      JSON.stringify({
        recommendations,
        hasHistory,
        sessionCount: sessions?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating adaptive recommendations:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
