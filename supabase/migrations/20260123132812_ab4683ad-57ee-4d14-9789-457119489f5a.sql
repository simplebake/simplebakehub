-- Security Fix: Protect email addresses from public exposure
-- This migration creates a secure view for public profile access

-- Step 1: Drop the overly permissive public profile policy
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;

-- Step 2: Create a restricted view for public profile access (excludes email)
CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  avatar_url,
  cover_image_url,
  bio,
  is_public,
  favorite_bread_type,
  baking_since,
  country,
  created_at,
  updated_at
FROM public.profiles
WHERE is_public = true;

-- Step 3: Grant access to the view for authenticated and anonymous users
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Step 4: Create a new restrictive policy for public profiles that denies direct email access
-- Users can only see their own full profile or admins can see all
-- For public profiles, users must use the public_profiles view
CREATE POLICY "Public profiles accessible via view only"
  ON public.profiles
  FOR SELECT
  USING (
    -- Own profile: can see everything including email
    (auth.uid() = id)
    OR
    -- Admins: can see everything
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Note: The existing "Users can view their own profile" and "Admins can view all profiles" 
-- policies are RESTRICTIVE (not permissive) so they will still work alongside this.
-- The key is we removed "Anyone can view public profiles" which exposed emails.