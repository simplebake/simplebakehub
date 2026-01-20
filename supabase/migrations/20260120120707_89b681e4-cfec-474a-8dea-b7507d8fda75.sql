-- Create permissions enum
CREATE TYPE public.app_permission AS ENUM (
  'can_view_analytics',
  'can_export_data',
  'can_manage_users',
  'can_manage_content',
  'can_view_audit_logs',
  'can_manage_security',
  'can_respond_messages',
  'can_delete_messages',
  'can_manage_tutorials',
  'can_manage_premixes',
  'can_manage_goals'
);

-- Role default permissions table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission app_permission NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);

-- User-specific permission overrides
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission app_permission NOT NULL,
  granted boolean NOT NULL DEFAULT true, -- true = grant, false = revoke
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS for role_permissions (admins only)
CREATE POLICY "Admins can manage role permissions"
  ON public.role_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view role permissions"
  ON public.role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS for user_permissions (admins only)
CREATE POLICY "Admins can manage user permissions"
  ON public.user_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check if user has a permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission app_permission)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- First check user-specific override
    (SELECT granted FROM public.user_permissions 
     WHERE user_id = _user_id AND permission = _permission),
    -- Fall back to role-based permission
    (SELECT EXISTS (
      SELECT 1 FROM public.role_permissions rp
      JOIN public.user_roles ur ON ur.role = rp.role
      WHERE ur.user_id = _user_id AND rp.permission = _permission
    )),
    false
  )
$$;

-- Insert default role permissions
-- Admin gets all permissions
INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'can_view_analytics'),
  ('admin', 'can_export_data'),
  ('admin', 'can_manage_users'),
  ('admin', 'can_manage_content'),
  ('admin', 'can_view_audit_logs'),
  ('admin', 'can_manage_security'),
  ('admin', 'can_respond_messages'),
  ('admin', 'can_delete_messages'),
  ('admin', 'can_manage_tutorials'),
  ('admin', 'can_manage_premixes'),
  ('admin', 'can_manage_goals');

-- Moderator permissions
INSERT INTO public.role_permissions (role, permission) VALUES
  ('moderator', 'can_respond_messages'),
  ('moderator', 'can_manage_content');

-- Support permissions
INSERT INTO public.role_permissions (role, permission) VALUES
  ('support', 'can_manage_tutorials'),
  ('support', 'can_view_analytics');