-- Create notification preferences table for staff
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  new_messages BOOLEAN NOT NULL DEFAULT true,
  status_updates BOOLEAN NOT NULL DEFAULT true,
  security_alerts BOOLEAN NOT NULL DEFAULT true,
  community_reports BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Only staff (admin, moderator, support) can view/manage their own preferences
CREATE POLICY "Staff can view their own preferences"
ON public.notification_preferences
FOR SELECT
USING (
  auth.uid() = user_id AND 
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role, 'support'::app_role])
);

CREATE POLICY "Staff can insert their own preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role, 'support'::app_role])
);

CREATE POLICY "Staff can update their own preferences"
ON public.notification_preferences
FOR UPDATE
USING (
  auth.uid() = user_id AND 
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role, 'support'::app_role])
);

-- Add trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();