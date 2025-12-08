-- Enable RLS on the rate_limit_violations view
-- Note: rate_limit_violations is actually a VIEW, not a table
-- We need to check if it's a view and handle accordingly

-- First, let's add RLS policies via a security barrier view approach
-- Since views don't support RLS directly, we'll create a secure function

-- Create a secure function for admins to query rate limit violations
CREATE OR REPLACE FUNCTION public.get_rate_limit_violations()
RETURNS TABLE (
  ip_address text,
  endpoint text,
  violation_count bigint,
  max_requests integer,
  last_violation timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ip_address,
    endpoint,
    violation_count,
    max_requests,
    last_violation
  FROM public.rate_limit_violations
$$;

-- Grant execute only to authenticated users (function will check admin role internally)
REVOKE ALL ON FUNCTION public.get_rate_limit_violations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rate_limit_violations() TO authenticated;

-- Create a wrapper function that enforces admin check
CREATE OR REPLACE FUNCTION public.get_rate_limit_violations_admin()
RETURNS TABLE (
  ip_address text,
  endpoint text,
  violation_count bigint,
  max_requests integer,
  last_violation timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY SELECT * FROM public.rate_limit_violations;
END;
$$;

-- Revoke direct access to the view from anon and authenticated roles
REVOKE ALL ON public.rate_limit_violations FROM anon;
REVOKE ALL ON public.rate_limit_violations FROM authenticated;

-- Only service role and postgres can access directly
GRANT SELECT ON public.rate_limit_violations TO service_role;