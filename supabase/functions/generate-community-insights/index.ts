import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { premixId, context } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query baking sessions data
    let query = supabase
      .from('baking_sessions')
      .select('*');
    
    if (premixId) {
      query = query.eq('premix_id', premixId);
    }
    
    const { data: sessions, error } = await query;
    
    if (error) throw error;

    // Aggregate insights
    const totalSessions = sessions?.length || 0;
    
    if (totalSessions < 3) {
      return new Response(
        JSON.stringify({ 
          insights: [],
          message: "Not enough data yet. Keep baking and sharing to build community wisdom!"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze patterns
    const successfulSessions = sessions?.filter(s => s.success_rating && s.success_rating >= 4) || [];
    const successRate = (successfulSessions.length / totalSessions * 100).toFixed(0);

    // Humidity patterns
    const humidSessions = sessions?.filter(s => s.humidity_percent && s.humidity_percent > 60) || [];
    const humidSuccess = humidSessions.filter(s => s.success_rating && s.success_rating >= 4);
    const avgHumidProofingAdjust = humidSuccess.length > 0 
      ? Math.round(humidSuccess.reduce((sum, s) => sum + (s.proofing_time_adjustment_minutes || 0), 0) / humidSuccess.length)
      : 0;

    // Altitude patterns
    const highAltSessions = sessions?.filter(s => s.altitude_meters && s.altitude_meters > 1000) || [];
    const highAltSuccess = highAltSessions.filter(s => s.success_rating && s.success_rating >= 4);
    const avgAltWaterAdjust = highAltSuccess.length > 0
      ? Math.round(highAltSuccess.reduce((sum, s) => sum + (s.water_adjustment_ml || 0), 0) / highAltSuccess.length)
      : 0;

    // Temperature patterns
    const coldSessions = sessions?.filter(s => s.temperature_celsius && s.temperature_celsius < 20) || [];
    const coldSuccess = coldSessions.filter(s => s.success_rating && s.success_rating >= 4);

    // Common issues
    const allIssues = sessions?.flatMap(s => s.issues || []) || [];
    const issueFrequency = allIssues.reduce((acc, issue) => {
      acc[issue] = (acc[issue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Build structured data for AI
    const dataContext = {
      totalSessions,
      successRate,
      humidClimate: {
        sessions: humidSessions.length,
        successfulSessions: humidSuccess.length,
        avgProofingAdjustment: avgHumidProofingAdjust,
        successRate: humidSessions.length > 0 ? (humidSuccess.length / humidSessions.length * 100).toFixed(0) : 0
      },
      highAltitude: {
        sessions: highAltSessions.length,
        successfulSessions: highAltSuccess.length,
        avgWaterAdjustment: avgAltWaterAdjust,
        successRate: highAltSessions.length > 0 ? (highAltSuccess.length / highAltSessions.length * 100).toFixed(0) : 0
      },
      coldEnvironment: {
        sessions: coldSessions.length,
        successfulSessions: coldSuccess.length,
        successRate: coldSessions.length > 0 ? (coldSuccess.length / coldSessions.length * 100).toFixed(0) : 0
      },
      topIssues: Object.entries(issueFrequency)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 3)
        .map(([issue, count]) => ({ issue, count: count as number, percentage: ((count as number) / totalSessions * 100).toFixed(0) }))
    };

    // Use AI to generate natural language insights
    const systemPrompt = `You are a baking community insights analyst. Generate 3-5 concise, actionable insights based on aggregated baking data. Always use British English spelling (e.g., flavour, colour, optimise).
    Each insight should:
    - Start with a percentage or statistic
    - Be specific about conditions and adjustments
    - Be encouraging and community-focused
    - Be 1-2 sentences maximum
    
    Format each insight as a JSON object with:
    - stat: the key percentage/number (e.g., "84%")
    - condition: what condition this applies to (e.g., "users in humid climates")
    - action: what they did (e.g., "extended proofing by 30 minutes")
    - icon: relevant emoji (🌡️, 💧, ⛰️, ⭐, 🎯, 🔥, etc.)
    
    Return ONLY a JSON array of insights.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Generate insights from this baking community data:\n${JSON.stringify(dataContext, null, 2)}\n\nContext: ${context || 'General baking insights'}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiContent = aiData.choices[0].message.content;
    
    // Parse AI response
    let insights;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || aiContent.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent;
      insights = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      // Fallback to raw statistics
      insights = [
        {
          stat: `${successRate}%`,
          condition: "of bakers in our community",
          action: "achieved great results with this recipe",
          icon: "⭐"
        }
      ];
      
      if (humidSuccess.length >= 3 && avgHumidProofingAdjust > 0) {
        insights.push({
          stat: `${dataContext.humidClimate.successRate}%`,
          condition: "of users in humid climates",
          action: `extended proofing by ${avgHumidProofingAdjust} minutes`,
          icon: "💧"
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        insights,
        totalSessions,
        metadata: dataContext
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating community insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
