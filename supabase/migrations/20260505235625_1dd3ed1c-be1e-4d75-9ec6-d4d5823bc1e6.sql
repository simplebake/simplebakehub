-- Update regenerate_webhook_secret to write an audit log entry
CREATE OR REPLACE FUNCTION public.regenerate_webhook_secret(_config_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_secret text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.webhook_configs
    WHERE id = _config_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: You do not own this webhook config';
  END IF;

  new_secret := encode(gen_random_bytes(32), 'hex');

  UPDATE public.webhook_configs
  SET secret_key = new_secret, updated_at = now()
  WHERE id = _config_id AND user_id = auth.uid();

  INSERT INTO public.audit_logs (user_id, event_type, endpoint, details)
  VALUES (
    auth.uid(),
    'webhook_secret_regenerated',
    'rpc:regenerate_webhook_secret',
    jsonb_build_object('webhook_config_id', _config_id)
  );

  RETURN new_secret;
END;
$function$;

-- Update verify_webhook_secret to write an audit log entry (success or failure)
CREATE OR REPLACE FUNCTION public.verify_webhook_secret(_config_id uuid, _provided_secret text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_match boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.webhook_configs
    WHERE id = _config_id
      AND secret_key = _provided_secret
      AND user_id = auth.uid()
  ) INTO is_match;

  INSERT INTO public.audit_logs (user_id, event_type, endpoint, details)
  VALUES (
    auth.uid(),
    'webhook_secret_verified',
    'rpc:verify_webhook_secret',
    jsonb_build_object('webhook_config_id', _config_id, 'matched', is_match)
  );

  RETURN is_match;
END;
$function$;