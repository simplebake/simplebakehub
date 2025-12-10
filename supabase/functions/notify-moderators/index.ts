import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  messageId: string;
  subject: string;
  category: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId, subject, category, message }: NotifyRequest = await req.json();

    console.log("Received notification request for message:", messageId);

    // Create Supabase client with service role for fetching moderator emails
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all moderator and admin user IDs
    const { data: staffRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "moderator"]);

    if (rolesError) {
      console.error("Error fetching staff roles:", rolesError);
      throw new Error("Failed to fetch staff members");
    }

    if (!staffRoles || staffRoles.length === 0) {
      console.log("No staff members found to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No staff to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch staff email addresses from profiles
    const staffUserIds = staffRoles.map(r => r.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email")
      .in("id", staffUserIds);

    if (profilesError) {
      console.error("Error fetching staff profiles:", profilesError);
      throw new Error("Failed to fetch staff emails");
    }

    if (!profiles || profiles.length === 0) {
      console.log("No staff email addresses found");
      return new Response(
        JSON.stringify({ success: true, message: "No staff emails found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const staffEmails = profiles.map(p => p.email).filter(Boolean);
    console.log(`Sending notification to ${staffEmails.length} staff member(s)`);

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "Simple Bake Hub <onboarding@resend.dev>",
      to: staffEmails,
      subject: `New Customer Message: ${subject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; font-size: 24px;">New Customer Message</h1>
          <p style="color: #666; font-size: 16px;">A new customer message has been received and requires your attention.</p>
          
          <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Category:</strong> ${category}</p>
            <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin: 0;"><strong>Message:</strong></p>
            <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${message}</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Please log in to the Simple Bake Hub admin panel to respond to this message.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from Simple Bake Hub.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-moderators function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
