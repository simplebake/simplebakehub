import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { reportResolutionTemplate } from "../_shared/emailTemplates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyReporterRequest {
  reportId: string;
  status: string;
  resolutionNotes: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;

    // Verify the caller has admin or moderator role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: hasRole } = await supabase.rpc("has_any_role", {
      _user_id: userId,
      _roles: ["admin", "moderator"],
    });

    if (!hasRole) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin or moderator role required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { reportId, status, resolutionNotes }: NotifyReporterRequest = await req.json();

    console.log("Notifying reporter for report:", reportId, "status:", status);

    // Get the report details
    const { data: report, error: reportError } = await supabase
      .from("content_reports")
      .select("reporter_id, content_type")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      console.error("Failed to fetch report:", reportError);
      return new Response(
        JSON.stringify({ error: "Report not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the reporter's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", report.reporter_id)
      .single();

    if (profileError || !profile?.email) {
      console.error("Failed to fetch reporter profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Reporter not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate the email template
    const emailTemplate = reportResolutionTemplate({
      status,
      contentType: report.content_type,
      resolutionNotes,
    });

    // Send the email
    const { error: emailError } = await resend.emails.send({
      from: "Simple Bake Hub <onboarding@resend.dev>",
      to: [profile.email],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (emailError) {
      console.error("Failed to send email:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Successfully sent notification to reporter:", profile.email);

    return new Response(
      JSON.stringify({ success: true, message: "Reporter notified" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-reporter function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
