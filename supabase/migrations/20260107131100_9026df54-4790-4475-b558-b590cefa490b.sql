-- Fix overly permissive RLS policies that use WITH CHECK (true) for INSERT
-- These policies should only allow service_role to insert, not public

-- 1. Drop and recreate integration_alerts insert policy 
DROP POLICY IF EXISTS "Service role can insert alerts" ON public.integration_alerts;
CREATE POLICY "Service role can insert alerts"
ON public.integration_alerts
FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. Drop and recreate performance_goal_history insert policy
DROP POLICY IF EXISTS "Service role can insert goal history" ON public.performance_goal_history;
CREATE POLICY "Service role can insert goal history"
ON public.performance_goal_history
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3. Drop and recreate user_achievements insert policy
DROP POLICY IF EXISTS "Service role can insert achievements" ON public.user_achievements;
CREATE POLICY "Service role can insert achievements"
ON public.user_achievements
FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. Drop and recreate webhook_logs insert policy
DROP POLICY IF EXISTS "Service role can insert webhook logs" ON public.webhook_logs;
CREATE POLICY "Service role can insert webhook logs"
ON public.webhook_logs
FOR INSERT
TO service_role
WITH CHECK (true);