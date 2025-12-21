import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { newMessageTemplate, statusUpdateTemplate, securityAlertTemplate, communityReportTemplate } from "../_shared/emailTemplates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type NotificationType = "new_message" | "status_update" | "security_alert" | "community_report";

interface NotifyRequest {
  type: NotificationType;
  data: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data }: NotifyRequest = await req.json();

    console.log(`Processing ${type} notification:`, data);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine which roles to notify based on notification type
    const rolesToNotify = type === "security_alert" 
      ? ["admin"] 
      : ["admin", "moderator"];

    // Fetch staff with relevant roles
    const { data: staffRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", rolesToNotify);

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

    const staffUserIds = staffRoles.map(r => r.user_id);

    // Map notification type to preference column
    const preferenceColumn = {
      new_message: "new_messages",
      status_update: "status_updates",
      security_alert: "security_alerts",
      community_report: "community_reports",
    }[type];

    // Check notification preferences for each staff member
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .in("user_id", staffUserIds)
      .eq(preferenceColumn, true);

    // Staff without preferences record get all notifications (default behavior)
    const staffWithPreferences = new Set(preferences?.map(p => p.user_id) || []);
    const staffWhoWantNotifications = staffUserIds.filter(userId => {
      // If no preference record exists, default to receiving notifications
      if (!staffWithPreferences.has(userId)) return true;
      // If preference exists and is true, include them
      return preferences?.some(p => p.user_id === userId);
    });

    if (staffWhoWantNotifications.length === 0) {
      console.log("No staff opted in for this notification type");
      return new Response(
        JSON.stringify({ success: true, message: "No staff opted in" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch email addresses
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email")
      .in("id", staffWhoWantNotifications);

    if (profilesError) {
      console.error("Error fetching staff profiles:", profilesError);
      throw new Error("Failed to fetch staff emails");
    }

    const staffEmails = profiles?.map(p => p.email).filter(Boolean) || [];

    if (staffEmails.length === 0) {
      console.log("No staff email addresses found");
      return new Response(
        JSON.stringify({ success: true, message: "No staff emails found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending ${type} notification to ${staffEmails.length} staff member(s)`);

    // Generate email content based on type
    let emailContent;
    switch (type) {
      case "new_message":
        emailContent = newMessageTemplate({
          category: data.category,
          subject: data.subject,
          message: data.message,
          senderEmail: data.email,
        });
        break;
      case "status_update":
        emailContent = statusUpdateTemplate({
          messageSubject: data.messageSubject,
          oldStatus: data.oldStatus,
          newStatus: data.newStatus,
          updatedBy: data.updatedBy,
        });
        break;
      case "security_alert":
        emailContent = securityAlertTemplate({
          alertType: data.alertType,
          ipAddress: data.ipAddress,
          reason: data.reason,
          timestamp: data.timestamp,
        });
        break;
      case "community_report":
        emailContent = communityReportTemplate({
          reportType: data.reportType,
          contentId: data.contentId,
          reportedBy: data.reportedBy,
          reason: data.reason,
        });
        break;
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "Simple Bake Hub <onboarding@resend.dev>",
      to: staffEmails,
      subject: emailContent.subject,
      html: emailContent.html,
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
