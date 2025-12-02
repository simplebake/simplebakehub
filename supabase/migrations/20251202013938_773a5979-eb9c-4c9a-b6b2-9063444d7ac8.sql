-- Add RLS policy to allow admins to view rate limits
CREATE POLICY "Admins can view rate limits"
ON public.rate_limits
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop the existing SECURITY DEFINER view
DROP VIEW IF EXISTS public.rate_limit_violations;

-- Recreate the view without SECURITY DEFINER
CREATE VIEW public.rate_limit_violations AS
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