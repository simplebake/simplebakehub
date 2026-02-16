
-- FIX 1: Remove staff-wide SELECT on profiles (exposes emails to moderators/support)
-- Staff should use public_profiles view which excludes email
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
