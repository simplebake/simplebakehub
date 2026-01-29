-- =====================================================
-- FIX SECURITY DEFINER VIEWS - Convert to SECURITY INVOKER
-- This ensures views use the querying user's RLS policies
-- =====================================================

-- Recreate webhook_configs_safe view with SECURITY INVOKER
DROP VIEW IF EXISTS public.webhook_configs_safe;
CREATE VIEW public.webhook_configs_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  is_enabled,
  retry_count,
  timeout_seconds,
  created_at,
  updated_at,
  outgoing_url,
  '••••••••' as secret_key_masked,
  subscribed_events
FROM public.webhook_configs;

-- Recreate public_profiles view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  avatar_url,
  bio,
  country,
  baking_since,
  favorite_bread_type,
  cover_image_url,
  is_public,
  created_at,
  updated_at
FROM public.profiles
WHERE is_public = true;