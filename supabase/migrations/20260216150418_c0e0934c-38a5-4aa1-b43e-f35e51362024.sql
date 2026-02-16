
-- =====================================================
-- FIX 1: Webhook secret exposure - remove direct SELECT on webhook_configs
-- Users must use webhook_configs_safe view instead
-- =====================================================

-- Drop user and admin SELECT policies on the base table
DROP POLICY IF EXISTS "Users can view their own webhook configs" ON public.webhook_configs;
DROP POLICY IF EXISTS "Admins can view all webhook configs" ON public.webhook_configs;

-- Add a service_role-only SELECT policy for edge functions that need secrets
CREATE POLICY "Service role can select webhook configs"
ON public.webhook_configs FOR SELECT
TO service_role
USING (true);

-- =====================================================
-- FIX 2: Profiles email exposure - tighten SELECT policies
-- Remove overlapping/permissive policies, keep strict owner-only + admin
-- =====================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles accessible via view only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate: users can only see their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins can view all profiles (for admin panel)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Moderators and support can view profiles (needed for content reports, user management)
CREATE POLICY "Staff can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['moderator'::app_role, 'support'::app_role]));
