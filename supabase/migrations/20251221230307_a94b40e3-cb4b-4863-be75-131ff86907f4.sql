-- Drop existing restrictive policies on webhook_configs
DROP POLICY IF EXISTS "Admins can delete webhook configs" ON public.webhook_configs;
DROP POLICY IF EXISTS "Admins can insert webhook configs" ON public.webhook_configs;
DROP POLICY IF EXISTS "Admins can update webhook configs" ON public.webhook_configs;
DROP POLICY IF EXISTS "Admins can view all webhook configs" ON public.webhook_configs;

-- Create new policies that allow users to manage their own webhook configs
CREATE POLICY "Users can view their own webhook configs" 
ON public.webhook_configs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhook configs" 
ON public.webhook_configs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhook configs" 
ON public.webhook_configs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhook configs" 
ON public.webhook_configs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow admins to view all configs for management purposes
CREATE POLICY "Admins can view all webhook configs" 
ON public.webhook_configs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));