
DROP POLICY IF EXISTS "Staff can view their own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Staff can insert their own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Staff can update their own preferences" ON public.notification_preferences;

CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
