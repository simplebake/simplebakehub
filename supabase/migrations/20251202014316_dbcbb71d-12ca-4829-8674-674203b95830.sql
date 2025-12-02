-- Drop and recreate the rate_limit_violations view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.rate_limit_violations;

-- Create the view with explicit security_invoker option
CREATE VIEW public.rate_limit_violations 
WITH (security_invoker = true)
AS
SELECT 
  ip_address,
  endpoint,
  count(*) AS violation_count,
  max(window_start) AS last_violation,
  max(request_count) AS max_requests
FROM public.rate_limits
WHERE request_count >= 60 
  AND window_start > (now() - interval '24 hours')
GROUP BY ip_address, endpoint
HAVING count(*) >= 3;