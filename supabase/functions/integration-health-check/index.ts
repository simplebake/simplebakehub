import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IntegrationConfig {
  id: string;
  name: string;
  healthEndpoint?: string;
  expectedStatus?: number;
}

// Define integrations to monitor
const integrations: IntegrationConfig[] = [
  {
    id: "shopify",
    name: "Shopify",
    healthEndpoint: "https://status.shopify.com/api/v2/status.json",
    expectedStatus: 200,
  },
  {
    id: "resend",
    name: "Resend",
    healthEndpoint: "https://resend.com/api/health",
    expectedStatus: 200,
  },
];

async function checkIntegrationHealth(
  integration: IntegrationConfig
): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
  if (!integration.healthEndpoint) {
    return { healthy: true, responseTime: 0 };
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(integration.healthEndpoint, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    const healthy = response.status === (integration.expectedStatus || 200);
    return { healthy, responseTime };
  } catch (error: unknown) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { healthy: false, responseTime, error: errorMessage };
  }
}

async function sendHealthAlert(
  supabase: any,
  integration: IntegrationConfig,
  alertType: string,
  message: string
) {
  // Get admin users to notify
  const { data: admins } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (!admins || admins.length === 0) {
    console.log("No admins to notify");
    return;
  }

  const adminIds = admins.map((a: { user_id: string }) => a.user_id);

  // Get admin profiles with email
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, name")
    .in("id", adminIds);

  // Check notification preferences
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, security_alerts")
    .in("user_id", adminIds);

  const prefsMap = new Map(prefs?.map((p: any) => [p.user_id, p.security_alerts]) || []);

  // Create alert record
  const { error: alertError } = await supabase.from("integration_alerts").insert({
    integration_id: integration.id,
    alert_type: alertType,
    message,
    notified_users: adminIds,
  });

  if (alertError) {
    console.error("Failed to create alert record:", alertError);
  }

  // Send email notifications
  for (const profile of profiles || []) {
    // Skip if user has disabled security alerts
    if (prefsMap.get(profile.id) === false) {
      continue;
    }

    try {
      await resend.emails.send({
        from: "Simple Bake Hub <onboarding@resend.dev>",
        to: [profile.email],
        subject: `🚨 Integration Alert: ${integration.name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🚨 Integration Health Alert</h1>
            </div>
            
            <div style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                Hi ${profile.name || "Admin"},
              </p>
              
              <div style="background-color: #fef2f2; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Integration:</td>
                    <td style="padding: 8px 0; color: #991b1b; font-size: 14px; font-weight: 600;">${integration.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Alert Type:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; text-transform: capitalize;">${alertType.replace('_', ' ')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Message:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px;">${message}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px;">${new Date().toISOString()}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                Please check the integration settings in your admin dashboard.
              </p>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This is an automated security notification from Simple Bake Hub
              </p>
            </div>
          </div>
        `,
      });
      console.log(`Alert sent to ${profile.email}`);
    } catch (emailError) {
      console.error(`Failed to send alert to ${profile.email}:`, emailError);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting integration health checks...");

    const results: Record<string, any> = {};

    for (const integration of integrations) {
      console.log(`Checking ${integration.name}...`);
      
      const healthResult = await checkIntegrationHealth(integration);
      
      // Get previous health state
      const { data: prevHealth } = await supabase
        .from("integration_health")
        .select("*")
        .eq("integration_id", integration.id)
        .single();

      const now = new Date().toISOString();
      const consecutiveFailures = healthResult.healthy
        ? 0
        : (prevHealth?.consecutive_failures || 0) + 1;

      // Update health record
      const healthData = {
        integration_id: integration.id,
        integration_name: integration.name,
        is_healthy: healthResult.healthy,
        last_check_at: now,
        last_success_at: healthResult.healthy ? now : prevHealth?.last_success_at,
        last_failure_at: healthResult.healthy ? prevHealth?.last_failure_at : now,
        consecutive_failures: consecutiveFailures,
        error_message: healthResult.error || null,
        response_time_ms: healthResult.responseTime,
        updated_at: now,
      };

      const { error: upsertError } = await supabase
        .from("integration_health")
        .upsert(healthData, { onConflict: "integration_id" });

      if (upsertError) {
        console.error(`Failed to update health for ${integration.name}:`, upsertError);
      }

      // Check if we need to send an alert
      const wasHealthy = prevHealth?.is_healthy ?? true;
      const isNowHealthy = healthResult.healthy;

      // Alert on state change
      if (wasHealthy && !isNowHealthy) {
        await sendHealthAlert(
          supabase,
          integration,
          "connection_failed",
          `${integration.name} is experiencing connection issues. Error: ${healthResult.error || "Unknown"}`
        );
      } else if (!wasHealthy && isNowHealthy) {
        await sendHealthAlert(
          supabase,
          integration,
          "recovered",
          `${integration.name} has recovered and is now healthy.`
        );
      } else if (healthResult.responseTime > 5000 && isNowHealthy) {
        // Alert on high latency
        await sendHealthAlert(
          supabase,
          integration,
          "high_latency",
          `${integration.name} is responding slowly (${healthResult.responseTime}ms).`
        );
      }

      results[integration.id] = {
        name: integration.name,
        healthy: healthResult.healthy,
        responseTime: healthResult.responseTime,
        error: healthResult.error,
      };
    }

    console.log("Health check complete:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in health check:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
