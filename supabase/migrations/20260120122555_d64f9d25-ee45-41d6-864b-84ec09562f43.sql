-- Create content visibility settings table
CREATE TABLE public.content_visibility_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('premixes', 'tutorials', 'community_bakes', 'dashboard_sections')),
  content_id uuid NULL,
  section_key text NULL,
  is_visible boolean NOT NULL DEFAULT true,
  visible_to_roles app_role[] DEFAULT '{}',
  visible_to_users uuid[] DEFAULT '{}',
  hidden_from_users uuid[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_type, content_id, section_key)
);

-- Enable RLS
ALTER TABLE public.content_visibility_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage visibility settings"
  ON public.content_visibility_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users with permission can manage visibility"
  ON public.content_visibility_settings FOR ALL
  USING (has_permission(auth.uid(), 'can_manage_visibility'::app_permission))
  WITH CHECK (has_permission(auth.uid(), 'can_manage_visibility'::app_permission));

CREATE POLICY "Authenticated users can view visibility settings"
  ON public.content_visibility_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_content_visibility_updated_at
  BEFORE UPDATE ON public.content_visibility_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant visibility permission to admins by default
INSERT INTO public.role_permissions (role, permission) 
VALUES ('admin', 'can_manage_visibility')
ON CONFLICT DO NOTHING;