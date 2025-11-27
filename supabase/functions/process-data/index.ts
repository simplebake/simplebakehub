import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_OPERATIONS = ['uppercase', 'lowercase', 'reverse', 'count'];
const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 1000;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate request body
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid request body');
    }

    const { data, operation } = body;

    // Validate operation
    if (!operation || typeof operation !== 'string') {
      throw new Error('Operation is required and must be a string');
    }

    if (!VALID_OPERATIONS.includes(operation)) {
      throw new Error(`Invalid operation. Must be one of: ${VALID_OPERATIONS.join(', ')}`);
    }

    // Validate data based on operation
    if (operation === 'uppercase' || operation === 'lowercase' || operation === 'reverse') {
      if (typeof data !== 'string') {
        throw new Error('Data must be a string for this operation');
      }
      if (data.length > MAX_STRING_LENGTH) {
        throw new Error(`String length must not exceed ${MAX_STRING_LENGTH} characters`);
      }
    }

    if (operation === 'count') {
      if (typeof data !== 'string' && !Array.isArray(data)) {
        throw new Error('Data must be a string or array for count operation');
      }
      if (typeof data === 'string' && data.length > MAX_STRING_LENGTH) {
        throw new Error(`String length must not exceed ${MAX_STRING_LENGTH} characters`);
      }
      if (Array.isArray(data) && data.length > MAX_ARRAY_LENGTH) {
        throw new Error(`Array length must not exceed ${MAX_ARRAY_LENGTH} items`);
      }
    }

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
