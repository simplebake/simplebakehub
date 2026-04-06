
-- 1. Fix: Remove overly permissive bake-photos INSERT policy (keeps only folder-scoped one)
DROP POLICY IF EXISTS "Authenticated users can upload bake photos" ON storage.objects;

-- Also clean up duplicate SELECT and DELETE policies on bake-photos
DROP POLICY IF EXISTS "Public can view all photos in bake-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

-- 2. Fix: Make user_roles UPDATE/DELETE policies use 'authenticated' instead of 'public'
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
CREATE POLICY "Admins can update user roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Admins can delete user roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix: Add Realtime authorization policy so users can only subscribe to their own channels
-- Remove notifications from realtime publication to prevent unauthorized subscriptions
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
