-- Internal/admin-only functions: revoke from everyone except postgres/service_role
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.cleanup_expired_blocks()',
    'public.cleanup_old_audit_logs()',
    'public.cleanup_old_rate_limits()',
    'public.get_rate_limit_violations_admin()',
    'public.get_rate_limit_violations_secure()',
    'public.handle_new_user()',
    'public.update_updated_at_column()',
    'public.regenerate_webhook_secret(uuid)',
    'public.verify_webhook_secret(uuid, text)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- RLS helpers: keep authenticated, drop anon and PUBLIC
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_any_role(uuid, app_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_permission(uuid, app_permission) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_role_permissions() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, app_permission) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role_permissions() TO authenticated;