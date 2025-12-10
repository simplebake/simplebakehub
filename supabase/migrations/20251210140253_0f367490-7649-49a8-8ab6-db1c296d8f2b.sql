-- Update tutorials RLS policies to allow support role to manage tutorials
DROP POLICY IF EXISTS "Admins can delete tutorials" ON public.tutorials;
DROP POLICY IF EXISTS "Admins can insert tutorials" ON public.tutorials;
DROP POLICY IF EXISTS "Admins can update tutorials" ON public.tutorials;

-- Recreate policies with support role access
CREATE POLICY "Admins and support can delete tutorials" 
ON public.tutorials 
FOR DELETE 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'support'::app_role]));

CREATE POLICY "Admins and support can insert tutorials" 
ON public.tutorials 
FOR INSERT 
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'support'::app_role]));

CREATE POLICY "Admins and support can update tutorials" 
ON public.tutorials 
FOR UPDATE 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'support'::app_role]));