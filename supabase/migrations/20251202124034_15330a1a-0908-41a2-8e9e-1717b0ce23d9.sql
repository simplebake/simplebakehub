-- Create enum for badge types
CREATE TYPE public.badge_type AS ENUM (
  'first_bake',
  'basics_master',
  'technique_explorer',
  'troubleshooting_pro',
  'rising_star',
  'gluten_free_champion',
  'learning_pioneer',
  'consistency_king',
  'advanced_baker',
  'community_contributor'
);

-- Create achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_type badge_type NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own achievements"
ON public.user_achievements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view others achievements for community"
ON public.user_achievements
FOR SELECT
USING (true);

CREATE POLICY "Service role can insert achievements"
ON public.user_achievements
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_badge_type ON public.user_achievements(badge_type);