import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data, operation } = await req.json();

    console.log('Processing data:', { data, operation });

    let result;

    // Example operations
    switch (operation) {
      case 'uppercase':
        result = typeof data === 'string' ? data.toUpperCase() : data;
        break;
      case 'lowercase':
        result = typeof data === 'string' ? data.toLowerCase() : data;
        break;
      case 'reverse':
        result = typeof data === 'string' ? data.split('').reverse().join('') : data;
        break;
      case 'count':
        result = typeof data === 'string' ? data.length : Array.isArray(data) ? data.length : 0;
        break;
      default:
        result = data;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        operation 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error processing data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
