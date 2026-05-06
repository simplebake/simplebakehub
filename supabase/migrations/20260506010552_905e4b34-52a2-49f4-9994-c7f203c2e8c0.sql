-- Restrict who can set or change webhook_configs.outgoing_url to admins only.
-- Owners can still create/update their webhook configs (secret rotation, toggling
-- is_enabled, subscribed_events, retry/timeout), but the destination URL — the
-- field that controls where data egresses — is admin-gated.

CREATE OR REPLACE FUNCTION public.enforce_outgoing_url_admin_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.outgoing_url IS NOT NULL
       AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can set outgoing_url on webhook_configs'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.outgoing_url IS DISTINCT FROM OLD.outgoing_url
       AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change outgoing_url on webhook_configs'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_outgoing_url_admin_only_trg ON public.webhook_configs;
CREATE TRIGGER enforce_outgoing_url_admin_only_trg
BEFORE INSERT OR UPDATE ON public.webhook_configs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_outgoing_url_admin_only();

-- Also tighten read access: previously only the service role and the owner could
-- read configs. Add admin SELECT so admins can audit destinations they manage.
DROP POLICY IF EXISTS "Owners can view their own webhook configs" ON public.webhook_configs;
CREATE POLICY "Owners can view their own webhook configs"
ON public.webhook_configs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all webhook configs" ON public.webhook_configs;
CREATE POLICY "Admins can view all webhook configs"
ON public.webhook_configs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));