CREATE OR REPLACE FUNCTION public.log_moderation_action(
  _action text,
  _content_type text,
  _content_id uuid,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role]) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator role required';
  END IF;

  IF _action IS NULL OR length(_action) = 0 OR length(_action) > 64 THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  IF _content_type IS NULL OR length(_content_type) = 0 OR length(_content_type) > 64 THEN
    RAISE EXCEPTION 'Invalid content_type';
  END IF;

  INSERT INTO public.audit_logs (user_id, event_type, endpoint, details)
  VALUES (
    auth.uid(),
    'moderation_action',
    'rpc:log_moderation_action',
    jsonb_build_object(
      'action', _action,
      'content_type', _content_type,
      'content_id', _content_id
    ) || COALESCE(_details, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_moderation_action(text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_moderation_action(text, text, uuid, jsonb) TO authenticated;