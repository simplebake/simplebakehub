
-- Create a secure function to get permissions for the calling user's roles
CREATE OR REPLACE FUNCTION public.get_my_role_permissions()
RETURNS TABLE(permission app_permission)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT rp.permission
  FROM public.role_permissions rp
  JOIN public.user_roles ur ON ur.role = rp.role
  WHERE ur.user_id = auth.uid()
$$;

-- Drop the overly permissive SELECT policy on role_permissions
DROP POLICY IF EXISTS "Authenticated can view role permissions" ON public.role_permissions;

-- Add restricted SELECT policy - only admins can view the full role_permissions table
CREATE POLICY "Admins can view role permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
