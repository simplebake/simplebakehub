import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    if (typeof body !== "object" || body === null) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { step, context } = body;

    if (typeof step !== "string" || step.trim().length === 0 || step.length > 300) {
      return new Response(
        JSON.stringify({ error: "Invalid 'step': must be a non-empty string up to 300 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (context !== undefined && context !== null) {
      if (typeof context !== "string" || context.length > 500) {
        return new Response(
          JSON.stringify({ error: "Invalid 'context': must be a string up to 500 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const sanitizedStep = step.trim().slice(0, 300);
    const sanitizedContext = typeof context === "string" ? context.trim().slice(0, 500) : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a friendly, expert sourdough baker assistant for Simple Bake — a company that sells gluten-free sourdough bread premix kits with dried starter powder.

The customer has received a Simple Bake kit containing a bread premix pouch and a dried sourdough starter powder pouch. Your job is to guide them through activating their starter and baking with it.

Simple Bake activation process:
- Day 1: Mix dried starter with equal parts water (50g starter + 50g water). Stir well, leave at room temperature.
- Days 2-3: Feed daily — discard half, add 26g water + 30g flour. Stir thoroughly each time.
- Keep at a consistent 24°C. A warm kitchen corner or proofing box works great. Avoid drafts and direct sunlight.
- Stir daily for proper fermentation. Ready when bubbly with a pleasant sour smell.

Simple Bake bread varieties: Quinoa, Buckwheat, Chickpea, Oat, Amaranth, Cornbread, and Gingerbread.

Key facts about gluten-free starters:
- They behave differently from wheat starters — less dramatic rise, more batter-like consistency
- Bubbles and pleasant tangy/sour aroma are the best readiness indicators
- They benefit from consistent feeding schedules and daily stirring
- Room temperature of 24°C is ideal for fermentation
- They typically take 2-3 days to fully activate from dried form

Always give temperatures in Celsius (with Fahrenheit in parentheses for reference).
Keep responses concise (2-4 sentences), warm, and encouraging. Use plain language suitable for beginners.
If the user describes a problem, diagnose it and give a specific actionable fix.`;

    const userMessage = `The user is at this step of the starter care process: "${sanitizedStep}".
Additional context from the user: "${sanitizedContext || 'none provided'}"

Give a helpful, specific tip for this stage. Be practical and reassuring.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const respBody = await response.text();
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status, respBody);
      throw new Error(`AI gateway error [${status}]`);
    }

    const data = await response.json();
    const tip = data.choices?.[0]?.message?.content || "Keep feeding consistently and be patient — your starter will get there!";

    return new Response(JSON.stringify({ tip }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("starter-ai error:", e);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
