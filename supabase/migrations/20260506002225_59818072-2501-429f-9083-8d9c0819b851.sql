
CREATE TABLE public.ci_security_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('passing','failing','unknown')),
  allowlist_entries text[] NOT NULL DEFAULT '{}',
  test_files text[] NOT NULL DEFAULT '{}',
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  commit_sha text,
  ci_run_url text,
  build_time timestamptz,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ci_security_status_checked_at ON public.ci_security_status (checked_at DESC);

ALTER TABLE public.ci_security_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view CI security status"
  ON public.ci_security_status
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No INSERT/UPDATE/DELETE policies: only the service role (CI + edge functions) writes.

INSERT INTO public.ci_security_status (status, allowlist_entries, test_files, issues, build_time, checked_at)
VALUES (
  'passing',
  ARRAY[
    'public.has_role',
    'public.has_any_role',
    'public.has_permission',
    'public.get_my_role_permissions',
    'public.regenerate_webhook_secret',
    'public.verify_webhook_secret',
    'public.log_security_doc_view',
    'public.log_moderation_action',
    'public.log_security_step_up'
  ],
  ARRAY['rls_test.ts','webhook_admin_test.ts','webhook_edge_cases_test.ts'],
  '[]'::jsonb,
  now(),
  now()
);
