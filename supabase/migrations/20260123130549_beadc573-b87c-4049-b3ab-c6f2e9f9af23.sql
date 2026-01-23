-- Add new columns to profiles table for enhanced public profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS favorite_bread_type text,
ADD COLUMN IF NOT EXISTS baking_since date;

-- Add constraint for bio length
ALTER TABLE public.profiles
ADD CONSTRAINT bio_max_length CHECK (char_length(bio) <= 300);

-- Add RLS policy to allow anyone to view public profiles
CREATE POLICY "Anyone can view public profiles"
ON public.profiles
FOR SELECT
USING (is_public = true);

-- Update existing policy to ensure users can still see their own profile even if private
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);