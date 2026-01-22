import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_STORE_DOMAIN = "simple-bake-2.myshopify.com";
const SHOPIFY_API_VERSION = "2025-01";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('Unauthorized access attempt: No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) {
      console.log('Unauthorized access attempt: Invalid token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verify admin/moderator role using service role client
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roles, error: rolesError } = await supabaseService
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedRoles = ['admin', 'moderator', 'support'];
    const hasAccess = roles?.some(r => allowedRoles.includes(r.role));
    
    if (!hasAccess) {
      console.log(`Forbidden access attempt by user ${user.id}: Insufficient permissions`);
      
      // Log unauthorized access attempt
      await supabaseService.from('audit_logs').insert({
        event_type: 'unauthorized_access_attempt',
        user_id: user.id,
        endpoint: 'shopify-orders',
        details: { reason: 'Insufficient role permissions', roles: roles?.map(r => r.role) }
      });

      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin, moderator, or support role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify Shopify token is configured
    const shopifyAccessToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    if (!shopifyAccessToken) {
      throw new Error('SHOPIFY_ACCESS_TOKEN not configured');
    }

    // 4. Parse query parameters
    const url = new URL(req.url);
    const limit = url.searchParams.get('limit') || '50';
    const status = url.searchParams.get('status') || 'any';
    const orderId = url.searchParams.get('order_id');
    const financialStatus = url.searchParams.get('financial_status');
    const fulfillmentStatus = url.searchParams.get('fulfillment_status');
    const createdAtMin = url.searchParams.get('created_at_min');
    const createdAtMax = url.searchParams.get('created_at_max');

    // Validate and sanitize inputs
    const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 250).toString();

    let endpoint: string;
    if (orderId) {
      endpoint = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders/${encodeURIComponent(orderId)}.json`;
    } else {
      const params = new URLSearchParams();
      params.set('limit', sanitizedLimit);
      params.set('status', status);
      
      if (financialStatus) params.set('financial_status', financialStatus);
      if (fulfillmentStatus) params.set('fulfillment_status', fulfillmentStatus);
      if (createdAtMin) params.set('created_at_min', createdAtMin);
      if (createdAtMax) params.set('created_at_max', createdAtMax);
      
      endpoint = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?${params.toString()}`;
    }

    // 5. Fetch orders from Shopify
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': shopifyAccessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API error:', response.status, errorText);
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();

    // 6. Log successful access for audit trail
    await supabaseService.from('audit_logs').insert({
      event_type: 'shopify_orders_accessed',
      user_id: user.id,
      endpoint: 'shopify-orders',
      details: { 
        order_count: data.orders?.length || (data.order ? 1 : 0),
        order_id: orderId || null
      }
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch orders' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
