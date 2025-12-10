-- Create a helper function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Update customer_messages policies to allow moderators to view and update
DROP POLICY IF EXISTS "Admins can view all messages" ON public.customer_messages;
CREATE POLICY "Admins and moderators can view all messages" 
ON public.customer_messages 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['admin', 'moderator']::app_role[]));

DROP POLICY IF EXISTS "Admins can update messages" ON public.customer_messages;
CREATE POLICY "Admins and moderators can update messages" 
ON public.customer_messages 
FOR UPDATE 
USING (has_any_role(auth.uid(), ARRAY['admin', 'moderator']::app_role[]));

-- Only admins can delete messages (keep this restricted)
DROP POLICY IF EXISTS "Admins can delete messages" ON public.customer_messages;
CREATE POLICY "Admins can delete messages" 
ON public.customer_messages 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));