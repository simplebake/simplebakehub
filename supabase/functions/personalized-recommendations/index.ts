import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract authenticated user ID from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's baking history
    const { data: bakeHistory, error: historyError } = await supabase
      .from('bake_shares')
      .select(`
        id,
        created_at,
        rating,
        premixes (
          id,
          name,
          difficulty,
          description
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (historyError) {
      console.error('Error fetching bake history:', historyError);
    }

    // Fetch user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch all available premixes
    const { data: allPremixes, error: premixesError } = await supabase
      .from('premixes')
      .select('id, name, difficulty, description')
      .order('created_at', { ascending: false });

    if (premixesError) {
      console.error('Error fetching premixes:', premixesError);
    }

    // Build context for AI
    const historyContext = bakeHistory && bakeHistory.length > 0
      ? bakeHistory.map((bake: any) => 
          `- ${bake.premixes.name} (${bake.premixes.difficulty}) ${bake.rating ? `- Rated ${bake.rating}/5` : ''}`
        ).join('\n')
      : 'No baking history yet';

    const preferencesContext = preferences?.preferences 
      ? JSON.stringify(preferences.preferences) 
      : 'No preferences set';

    const availablePremixes = allPremixes
      ? allPremixes.map((p: any) => `${p.name} (${p.difficulty}): ${p.description}`).join('\n')
      : '';

    const prompt = `You are a baking recommendation assistant. Based on the user's baking history and preferences, recommend 3 premixes they should try next.

User's Baking History:
${historyContext}

User's Preferences:
${preferencesContext}

Available Premixes:
${availablePremixes}

Provide 3 specific premix recommendations from the available premixes. For each recommendation:
1. Name the exact premix from the list
2. Explain why it matches their history/preferences (1-2 sentences)
3. Highlight what's special about it

Format your response as a JSON array with objects containing: premixName, reason, highlight`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful baking assistant that provides personalised recommendations. Always use British English spelling (e.g., flavour, colour, specialise).' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service quota exceeded. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to generate recommendations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;

    // Parse AI response to extract recommendations
    let recommendations;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      recommendations = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: Return generic recommendations
      recommendations = allPremixes?.slice(0, 3).map((p: any) => ({
        premixName: p.name,
        reason: `Try this ${p.difficulty} level premix for a new baking experience.`,
        highlight: p.description
      })) || [];
    }

    // Match recommendations with actual premix data
    const enrichedRecommendations = recommendations.map((rec: any) => {
      const premix = allPremixes?.find((p: any) => 
        p.name.toLowerCase() === rec.premixName.toLowerCase()
      );
      return {
        ...rec,
        premixId: premix?.id,
        difficulty: premix?.difficulty,
        description: premix?.description
      };
    }).filter((rec: any) => rec.premixId); // Only include valid matches

    return new Response(
      JSON.stringify({ 
        recommendations: enrichedRecommendations,
        hasHistory: bakeHistory && bakeHistory.length > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in personalized-recommendations:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});