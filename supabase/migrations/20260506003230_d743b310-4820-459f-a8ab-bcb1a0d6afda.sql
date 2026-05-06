CREATE OR REPLACE FUNCTION public.log_ci_gate_resolution(
  _issue_kind text,
  _issue_label text,
  _path text,
  _action text,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  IF _issue_kind IS NULL OR _issue_kind NOT IN (
    'missing-allowlist','extra-allowlist','missing-test','extra-test'
  ) THEN
    RAISE EXCEPTION 'Invalid issue_kind';
  END IF;

  IF _issue_label IS NULL OR length(_issue_label) = 0 OR length(_issue_label) > 256 THEN
    RAISE EXCEPTION 'Invalid issue_label';
  END IF;

  IF _path IS NULL OR _path NOT IN ('primary','alternate','unresolve') THEN
    RAISE EXCEPTION 'Invalid path';
  END IF;

  IF _action IS NULL OR length(_action) = 0 OR length(_action) > 64 THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  INSERT INTO public.audit_logs (user_id, event_type, endpoint, details)
  VALUES (
    auth.uid(),
    'ci_gate_resolution',
    'rpc:log_ci_gate_resolution',
    jsonb_build_object(
      'issue_kind', _issue_kind,
      'issue_label', _issue_label,
      'path', _path,
      'action', _action
    ) || COALESCE(_details, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_ci_gate_resolution(text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_ci_gate_resolution(text, text, text, text, jsonb) TO authenticated;
