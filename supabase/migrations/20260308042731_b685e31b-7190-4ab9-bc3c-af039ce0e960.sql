-- Drop the two overly permissive policies on blocked_ips that target public role
DROP POLICY IF EXISTS "Service role can manage blocked IPs" ON public.blocked_ips;
DROP POLICY IF EXISTS "Service role manages blocked IPs" ON public.blocked_ips;