-- Create followers table for the following system
CREATE TABLE public.followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Anyone can view follower relationships
CREATE POLICY "Anyone can view followers"
ON public.followers
FOR SELECT
USING (true);

-- Users can follow others
CREATE POLICY "Users can follow others"
ON public.followers
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
ON public.followers
FOR DELETE
USING (auth.uid() = follower_id);

-- Create indexes for performance
CREATE INDEX idx_followers_follower_id ON public.followers(follower_id);
CREATE INDEX idx_followers_following_id ON public.followers(following_id);