-- =====================================================
-- SECURITY FIX 1: Protect webhook secret keys
-- Create a view that excludes secret_key from webhook_configs
-- =====================================================

-- Create a secure view that masks the secret key
CREATE OR REPLACE VIEW public.webhook_configs_safe AS
SELECT 
  id,
  user_id,
  is_enabled,
  retry_count,
  timeout_seconds,
  created_at,
  updated_at,
  outgoing_url,
  '••••••••' as secret_key_masked,  -- Mask the secret key
  subscribed_events
FROM public.webhook_configs;

-- =====================================================
-- SECURITY FIX 2: Update public_profiles view to exclude email
-- and ensure only public profiles are accessible
-- =====================================================

-- Drop and recreate the public_profiles view to exclude email
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
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
  -- NOTE: email is intentionally excluded for security
FROM public.profiles
WHERE is_public = true;

-- =====================================================
-- SECURITY FIX 3: Create secure function to verify webhook secrets
-- without exposing them through SELECT queries
-- =====================================================

-- Create a function to verify a webhook secret without exposing it
CREATE OR REPLACE FUNCTION public.verify_webhook_secret(
  _config_id uuid,
  _provided_secret text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.webhook_configs 
    WHERE id = _config_id 
      AND secret_key = _provided_secret
      AND user_id = auth.uid()
  );
END;
$$;

-- Create a function to regenerate webhook secret
CREATE OR REPLACE FUNCTION public.regenerate_webhook_secret(_config_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_secret text;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.webhook_configs 
    WHERE id = _config_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: You do not own this webhook config';
  END IF;
  
  -- Generate new secret
  new_secret := encode(gen_random_bytes(32), 'hex');
  
  -- Update the secret
  UPDATE public.webhook_configs 
  SET secret_key = new_secret, updated_at = now()
  WHERE id = _config_id AND user_id = auth.uid();
  
  -- Return the new secret (only shown once)
  RETURN new_secret;
END;
$$;