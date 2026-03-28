
-- Fix privilege escalation: DROP the INSERT policy that uses USING instead of WITH CHECK
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;

-- Recreate with proper WITH CHECK and scoped to authenticated only
CREATE POLICY "Admins can insert user roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
