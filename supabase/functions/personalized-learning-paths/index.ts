import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize service client for database queries
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch user's baking history
    const { data: bakingSessions, error: sessionsError } = await supabaseService
      .from("baking_sessions")
      .select(`
        *,
        premixes (name, difficulty)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (sessionsError) {
      console.error("Sessions fetch error:", sessionsError);
    }

    // Fetch user preferences
    const { data: preferences } = await supabaseService
      .from("user_preferences")
      .select("preferences")
      .eq("user_id", user.id)
      .single();

    // Fetch all available tutorials
    const { data: tutorials, error: tutorialsError } = await supabaseService
      .from("tutorials")
      .select("*")
      .order("created_at", { ascending: false });

    if (tutorialsError) {
      console.error("Tutorials fetch error:", tutorialsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tutorials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context for AI analysis
    const sessionsContext = bakingSessions?.length 
      ? bakingSessions.map(s => ({
          premix: s.premixes?.name || "Unknown",
          difficulty: s.premixes?.difficulty || "Unknown",
          success: s.success_rating,
          issues: s.issues || [],
          mixingMethod: s.mixing_method,
          ovenType: s.oven_type
        }))
      : [];

    const avgRating = sessionsContext.length 
      ? sessionsContext.reduce((sum, s) => sum + (s.success || 0), 0) / sessionsContext.length 
      : 0;

    const allIssues = sessionsContext.flatMap(s => s.issues);
    const issueFrequency: Record<string, number> = {};
    allIssues.forEach(issue => {
      issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
    });

    const difficultiesAttempted = [...new Set(sessionsContext.map(s => s.difficulty))];
    const mixingMethods = [...new Set(sessionsContext.map(s => s.mixingMethod).filter(Boolean))];

    const tutorialsList = tutorials?.map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      tags: t.tags || []
    })) || [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert gluten-free baking instructor creating personalised learning paths. Always use British English spelling (e.g., "personalised", "colour", "flavour", "behaviour").

Analyse the baker's history and recommend tutorials in priority order based on their skill gaps and areas needing improvement.

Consider:
- Common issues they've experienced
- Difficulty levels they've attempted
- Their success rates
- Techniques they haven't explored
- Progressive skill building

Return a JSON object with this exact structure:
{
  "learningPath": [
    {
      "tutorialId": "uuid",
      "priority": 1,
      "reason": "Brief explanation why this tutorial is recommended",
      "skillGap": "The specific skill gap this addresses"
    }
  ],
  "skillAssessment": {
    "strengths": ["list of identified strengths"],
    "areasToImprove": ["list of areas needing work"],
    "recommendedNextLevel": "beginner|intermediate|advanced"
  },
  "encouragement": "A brief personalised encouraging message"
}

Only include tutorials from the provided list. Recommend 3-6 tutorials maximum.`;

    const userPrompt = `Analyse this baker's profile and create a personalised learning path:

BAKING HISTORY:
- Total bakes: ${sessionsContext.length}
- Average success rating: ${avgRating.toFixed(1)}/5
- Difficulties attempted: ${difficultiesAttempted.join(", ") || "None yet"}
- Mixing methods used: ${mixingMethods.join(", ") || "Not recorded"}

COMMON ISSUES EXPERIENCED:
${Object.entries(issueFrequency).map(([issue, count]) => `- ${issue}: ${count} time(s)`).join("\n") || "No issues recorded"}

USER PREFERENCES:
${preferences?.preferences ? JSON.stringify(preferences.preferences, null, 2) : "No preferences set"}

AVAILABLE TUTORIALS:
${JSON.stringify(tutorialsList, null, 2)}

Create a personalised learning path that addresses their skill gaps and helps them progress.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let learningPathData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        learningPathData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      learningPathData = {
        learningPath: [],
        skillAssessment: {
          strengths: [],
          areasToImprove: ["Unable to analyse - try again"],
          recommendedNextLevel: "beginner"
        },
        encouragement: "Keep baking and building your skills!"
      };
    }

    // Enrich learning path with full tutorial data
    const enrichedPath = learningPathData.learningPath.map((item: any) => {
      const tutorial = tutorials?.find(t => t.id === item.tutorialId);
      return {
        ...item,
        tutorial: tutorial || null
      };
    }).filter((item: any) => item.tutorial !== null);

    return new Response(
      JSON.stringify({
        learningPath: enrichedPath,
        skillAssessment: learningPathData.skillAssessment,
        encouragement: learningPathData.encouragement,
        stats: {
          totalBakes: sessionsContext.length,
          avgRating: avgRating.toFixed(1),
          tutorialsAvailable: tutorials?.length || 0
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in personalized-learning-paths:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
