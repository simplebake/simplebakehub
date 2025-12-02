-- Create blocked_ips table
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_blocked BOOLEAN NOT NULL DEFAULT false,
  violation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON public.blocked_ips(ip_address) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires_at ON public.blocked_ips(expires_at) WHERE expires_at IS NOT NULL AND is_active = true;

-- Enable RLS
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage blocked IPs (for edge functions)
CREATE POLICY "Service role can manage blocked IPs"
ON public.blocked_ips
FOR ALL
USING (true)
WITH CHECK (true);

-- Policy: Admins can view all blocked IPs
CREATE POLICY "Admins can view blocked IPs"
ON public.blocked_ips
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can insert blocked IPs
CREATE POLICY "Admins can insert blocked IPs"
ON public.blocked_ips
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can update blocked IPs
CREATE POLICY "Admins can update blocked IPs"
ON public.blocked_ips
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can delete blocked IPs
CREATE POLICY "Admins can delete blocked IPs"
ON public.blocked_ips
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to automatically expire old blocks
CREATE OR REPLACE FUNCTION public.cleanup_expired_blocks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blocked_ips
  SET is_active = false
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND is_active = true;
END;
$$;

-- Create view for rate limit violations
CREATE OR REPLACE VIEW public.rate_limit_violations AS
SELECT 
  ip_address,
  endpoint,
  COUNT(*) as violation_count,
  MAX(window_start) as last_violation,
  MAX(request_count) as max_requests
FROM public.rate_limits
WHERE request_count >= 60
  AND window_start > NOW() - INTERVAL '24 hours'
GROUP BY ip_address, endpoint
HAVING COUNT(*) >= 3;

COMMENT ON TABLE public.blocked_ips IS 'Stores IP addresses that have been blocked due to abuse or suspicious behavior';
COMMENT ON VIEW public.rate_limit_violations IS 'Shows IP addresses that have violated rate limits multiple times in the last 24 hours';