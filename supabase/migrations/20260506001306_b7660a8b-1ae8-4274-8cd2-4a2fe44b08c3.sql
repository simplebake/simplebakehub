CREATE OR REPLACE FUNCTION public.regenerate_webhook_secret(_config_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_secret text;
  v_old_updated_at timestamptz;
  v_outgoing_url text;
  v_outgoing_host text;
  v_is_enabled boolean;
  v_subscribed_events text[];
  v_owner_id uuid;
  v_acting_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT wc.updated_at, wc.outgoing_url, wc.is_enabled, wc.subscribed_events, wc.user_id
    INTO v_old_updated_at, v_outgoing_url, v_is_enabled, v_subscribed_events, v_owner_id
  FROM public.webhook_configs wc
  WHERE wc.id = _config_id AND wc.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access denied: You do not own this webhook config';
  END IF;

  -- Extract host only (avoid storing full URLs/paths in audit details)
  IF v_outgoing_url IS NOT NULL THEN
    v_outgoing_host := substring(v_outgoing_url from 'https?://([^/?#]+)');
  END IF;

  SELECT email INTO v_acting_email FROM auth.users WHERE id = auth.uid();

  new_secret := encode(gen_random_bytes(32), 'hex');

  UPDATE public.webhook_configs
  SET secret_key = new_secret, updated_at = now()
  WHERE id = _config_id AND user_id = auth.uid();

  INSERT INTO public.audit_logs (user_id, event_type, endpoint, details)
  VALUES (
    auth.uid(),
    'webhook_secret_regenerated',
    'rpc:regenerate_webhook_secret',
    jsonb_build_object(
      'webhook_config_id', _config_id,
      'acting_user_id', auth.uid(),
      'acting_user_email_domain', split_part(coalesce(v_acting_email, ''), '@', 2),
      'owner_user_id', v_owner_id,
      'outgoing_host', v_outgoing_host,
      'is_enabled', v_is_enabled,
      'subscribed_events_count', coalesce(array_length(v_subscribed_events, 1), 0),
      'previous_updated_at', v_old_updated_at,
      'rotated_at', now(),
      'secret_length_bytes', 32
    )
  );

  RETURN new_secret;
END;
$function$;