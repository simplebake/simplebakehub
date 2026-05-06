CREATE OR REPLACE FUNCTION public.log_security_doc_view()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  INSERT INTO public.audit_logs (user_id, event_type, endpoint, details)
  VALUES (
    auth.uid(),
    'security_doc_viewed',
    'rpc:log_security_doc_view',
    '{}'::jsonb
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.log_security_doc_view() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_security_doc_view() TO authenticated;