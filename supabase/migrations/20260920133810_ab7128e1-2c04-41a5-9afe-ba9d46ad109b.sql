CREATE OR REPLACE FUNCTION public.can_view_bake_share(_bake_share_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bake_shares bs
    WHERE bs.id = _bake_share_id
      AND (
        bs.is_visible = true
        OR bs.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
$$;

DROP POLICY IF EXISTS "Anyone can view bake comments" ON public.bake_comments;
CREATE POLICY "Comments visible only on viewable bake shares"
ON public.bake_comments
FOR SELECT
USING (public.can_view_bake_share(bake_share_id));

DROP POLICY IF EXISTS "Anyone can view bake likes" ON public.bake_likes;
CREATE POLICY "Likes visible only on viewable bake shares"
ON public.bake_likes
FOR SELECT
USING (public.can_view_bake_share(bake_share_id));