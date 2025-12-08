-- Make audit_logs table completely immutable
-- Add explicit restrictive policies to deny UPDATE and DELETE for all users

-- Drop any existing UPDATE/DELETE policies if they exist (cleanup)
DROP POLICY IF EXISTS "No one can update audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "No one can delete audit logs" ON public.audit_logs;

-- Create explicit RESTRICTIVE policies that deny UPDATE operations
-- Using RESTRICTIVE ensures these policies MUST pass (in addition to any permissive policies)
CREATE POLICY "No one can update audit logs"
ON public.audit_logs
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false);

-- Create explicit RESTRICTIVE policy that denies DELETE operations
CREATE POLICY "No one can delete audit logs"
ON public.audit_logs
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

-- Also add for anon role to be thorough
CREATE POLICY "Anon cannot update audit logs"
ON public.audit_logs
AS RESTRICTIVE
FOR UPDATE
TO anon
USING (false);

CREATE POLICY "Anon cannot delete audit logs"
ON public.audit_logs
AS RESTRICTIVE
FOR DELETE
TO anon
USING (false);