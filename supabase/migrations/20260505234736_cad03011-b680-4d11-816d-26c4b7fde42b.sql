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

  RETURN new_secret;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_webhook_secret(_config_id uuid, _provided_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.webhook_configs
    WHERE id = _config_id
      AND secret_key = _provided_secret
      AND user_id = auth.uid()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.regenerate_webhook_secret(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_webhook_secret(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_webhook_secret(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_webhook_secret(uuid, text) TO authenticated;