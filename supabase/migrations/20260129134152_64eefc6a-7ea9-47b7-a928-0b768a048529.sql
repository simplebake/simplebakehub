-- 1. Create a safe view for customer_messages that masks email for non-admins
CREATE OR REPLACE VIEW public.customer_messages_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  subject,
  category,
  message,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN email
    ELSE CONCAT(
      SUBSTRING(email FROM 1 FOR 1),
      '***@',
      SUBSTRING(email FROM POSITION('@' IN email) + 1)
    )
  END as email,
  user_id,
  status,
  created_at,
  updated_at
FROM public.customer_messages;

-- 2. Create a safe view for push_subscriptions that hides sensitive tokens
CREATE OR REPLACE VIEW public.push_subscriptions_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  endpoint,
  created_at,
  updated_at
FROM public.push_subscriptions;

-- 3. Drop existing permissive SELECT policies on push_subscriptions
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;

-- Users can only INSERT/UPDATE/DELETE their own subscriptions
CREATE POLICY "Users can insert their own push subscriptions"
ON public.push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
ON public.push_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
ON public.push_subscriptions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Only service_role can SELECT (for sending notifications)
CREATE POLICY "Service role can select push subscriptions"
ON public.push_subscriptions FOR SELECT
TO service_role
USING (true);

-- 4. Harden audit_logs - restrict to service_role INSERT and admin SELECT
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role full access to audit_logs" ON public.audit_logs;

CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Harden rate_limits - service_role only
DROP POLICY IF EXISTS "Service role full access to rate_limits" ON public.rate_limits;

CREATE POLICY "Service role manages rate limits"
ON public.rate_limits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Harden blocked_ips - service_role for ALL, admin for SELECT
DROP POLICY IF EXISTS "Service role full access to blocked_ips" ON public.blocked_ips;
DROP POLICY IF EXISTS "Admins can view blocked IPs" ON public.blocked_ips;

CREATE POLICY "Service role manages blocked IPs"
ON public.blocked_ips FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view blocked IPs"
ON public.blocked_ips FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));