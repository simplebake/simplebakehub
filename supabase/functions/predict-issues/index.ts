import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { premixName, stepTitle, stepContent, observations, stepNumber, totalSteps } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context from observations
    const observationsText = observations && observations.length > 0 
      ? observations.join(", ") 
      : "no specific observations";

    const systemPrompt = `You are an expert gluten-free baking troubleshooter with deep knowledge of dough behavior, ingredient chemistry, and common baking issues. Your role is to predict potential problems before they escalate and provide actionable solutions.

Analyze the current baking situation and provide:
1. Issue Severity (low/medium/high)
2. Predicted Problem (if any)
3. Why this might happen
4. Immediate corrective action
5. Prevention tip for next time

Be proactive but not alarmist. If everything seems fine, provide encouragement and what to watch for next.`;

    const userPrompt = `Current Situation:
- Recipe: ${premixName}
- Step: ${stepNumber}/${totalSteps} - ${stepTitle}
- Step Details: ${stepContent}
- User Observations: ${observationsText}

Analyze this and predict any potential issues. If the observations indicate problems, diagnose them. If everything seems normal, provide what to watch for in upcoming steps. Keep response under 100 words.`;

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
    const prediction = data.choices[0].message.content;

    // Determine severity from response (simple heuristic)
    let severity = "low";
    const lowerPrediction = prediction.toLowerCase();
    if (lowerPrediction.includes("critical") || lowerPrediction.includes("urgent") || lowerPrediction.includes("immediate")) {
      severity = "high";
    } else if (lowerPrediction.includes("warning") || lowerPrediction.includes("watch") || lowerPrediction.includes("concern")) {
      severity = "medium";
    }

    return new Response(JSON.stringify({ prediction, severity }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error predicting issues:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
