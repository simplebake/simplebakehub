import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(req);
    if ("response" in auth) return auth.response;

    const { ingredients, dietaryNotes, difficulty, bakeType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!ingredients || ingredients.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Please provide at least one ingredient" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert gluten-free baker specialising in creative recipes. Always use British English spelling (e.g., colour, flavour, practise). Temperatures in Celsius first with Fahrenheit in parentheses.

Generate a complete, original gluten-free recipe. Format your response EXACTLY as:

RECIPE NAME: [Creative name]
DIFFICULTY: [Easy / Medium / Advanced]
PREP TIME: [time]
BAKE TIME: [time]
SERVES: [number]
DESCRIPTION: [1-2 enticing sentences]

INGREDIENTS:
- [ingredient with exact measurement]
- [continue listing all ingredients]

METHOD:
1. [Clear step]
2. [Continue with numbered steps]

TIPS:
- [2-3 helpful tips specific to this recipe]

ALLERGEN INFO: [List any common allergens present besides gluten]`
          },
          {
            role: "user",
            content: `Create a gluten-free recipe using these ingredients: ${ingredients}.${bakeType ? ` Type of bake: ${bakeType}.` : ""}${difficulty ? ` Difficulty level: ${difficulty}.` : ""}${dietaryNotes ? ` Additional dietary requirements: ${dietaryNotes}.` : ""}`
          }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service quota exceeded." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const recipe = data.choices[0].message.content;

    return new Response(JSON.stringify({ recipe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating recipe:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
