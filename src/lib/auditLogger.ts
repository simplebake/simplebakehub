import { supabase } from '@/integrations/supabase/client';

export const logAuthEvent = async (
  eventType: 'signup' | 'signin' | 'signout' | 'password_reset' | 'email_verification',
  userId?: string,
  details?: Record<string, any>
) => {
  try {
    // Use edge function to log since it has service role access
    await supabase.functions.invoke('log-auth-event', {
      body: {
        eventType,
        userId,
        details
      }
    });
  } catch (error) {
    // Don't throw - logging failures shouldn't break the auth flow
    console.error('Failed to log auth event:', error);
  }
};

export const logAdminAction = async (
  action: string,
  targetUserId?: string,
  details?: Record<string, any>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_logs').insert({
      event_type: 'admin_action',
      user_id: user.id,
      ip_address: 'webapp',
      endpoint: action,
      details: {
        ...details,
        target_user_id: targetUserId
      }
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};
