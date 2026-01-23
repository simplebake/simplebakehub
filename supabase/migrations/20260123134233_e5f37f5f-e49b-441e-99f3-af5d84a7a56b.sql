-- Add parent_comment_id for reply functionality
ALTER TABLE public.bake_comments 
ADD COLUMN parent_comment_id uuid REFERENCES public.bake_comments(id) ON DELETE CASCADE;

-- Create index for faster nested comment queries
CREATE INDEX idx_bake_comments_parent ON public.bake_comments(parent_comment_id);
CREATE INDEX idx_bake_comments_bake_share ON public.bake_comments(bake_share_id);