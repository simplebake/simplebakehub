import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse URL for optional query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const difficulty = url.searchParams.get("difficulty");

    // Build query
    let query = supabase
      .from("premixes")
      .select("id, name, description, difficulty, water_amount, oil_amount, optional_extras, image_url, created_at, updated_at")
      .order("name");

    // Apply optional difficulty filter
    if (difficulty && ["Beginner", "Intermediate", "Advanced"].includes(difficulty)) {
      query = query.eq("difficulty", difficulty);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch recipes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from("premixes")
      .select("*", { count: "exact", head: true });

    return new Response(
      JSON.stringify({
        recipes: data || [],
        pagination: {
          limit,
          offset,
          total: totalCount || 0,
          hasMore: (offset + limit) < (totalCount || 0),
        },
        _links: {
          self: `${supabaseUrl}/functions/v1/public-recipes?limit=${limit}&offset=${offset}`,
          next: (offset + limit) < (totalCount || 0) 
            ? `${supabaseUrl}/functions/v1/public-recipes?limit=${limit}&offset=${offset + limit}`
            : null,
        },
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60", // Cache for 1 minute
        } 
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
