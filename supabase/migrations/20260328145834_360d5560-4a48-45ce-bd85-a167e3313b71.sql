
-- Drop the overly permissive community achievements policy
DROP POLICY IF EXISTS "Authenticated users can view community achievements" ON public.user_achievements;

-- The remaining "Users can view their own achievements" policy (auth.uid() = user_id) is sufficient
-- If we need community-visible achievements (e.g. on public profiles), use a view instead
