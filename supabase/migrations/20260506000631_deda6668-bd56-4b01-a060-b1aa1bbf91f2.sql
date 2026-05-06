CREATE OR REPLACE FUNCTION public.log_security_step_up()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  INSERT INTO public.audit_logs (user_id, event_type, endpoint, details)
  VALUES (
    auth.uid(),
    'security_step_up_confirmed',
    'rpc:log_security_step_up',
    '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_security_step_up() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_security_step_up() TO authenticated;