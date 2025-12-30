-- Fix 1: integration_health - Remove public read access, keep admin-only
-- The existing policy "Admins can view integration health" is correct
-- But we need to ensure there's no public access path

-- Fix 2: rate_limit_violations is a VIEW - we need to secure access via the function
-- The get_rate_limit_violations_admin function already has admin check, but the base function doesn't
-- Drop the insecure function and keep only the admin one
DROP FUNCTION IF EXISTS public.get_rate_limit_violations();

-- Fix 3: customer_messages - Restrict INSERT to authenticated users only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can submit messages" ON public.customer_messages;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can submit messages"
ON public.customer_messages
FOR INSERT
WITH CHECK (true);

-- Actually, the contact form should work for non-logged-in users too
-- But we should at least require the user_id to be set if logged in
-- Let's create a more balanced approach - allow insert but require rate limiting via edge function
DROP POLICY IF EXISTS "Authenticated users can submit messages" ON public.customer_messages;

CREATE POLICY "Anyone can submit messages with validation"
ON public.customer_messages
FOR INSERT
WITH CHECK (
  -- If user is authenticated, user_id must match auth.uid()
  -- If user is not authenticated (anonymous), user_id must be null
  (auth.uid() IS NULL AND user_id IS NULL) OR (auth.uid() = user_id)
);

-- Fix 4: user_achievements - Make community view opt-in or restrict to authenticated users
-- Remove the overly broad public SELECT policy
DROP POLICY IF EXISTS "Users can view others achievements for community" ON public.user_achievements;

-- Create a more restrictive policy - only authenticated users can see community achievements
-- This prevents anonymous enumeration of user activity
CREATE POLICY "Authenticated users can view community achievements"
ON public.user_achievements
FOR SELECT
USING (
  -- Users can always see their own achievements
  auth.uid() = user_id
  -- Or authenticated users can see others' achievements (for community features)
  OR auth.uid() IS NOT NULL
);