-- Revoke EXECUTE from anon/authenticated on internal/admin-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_blocks() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_logs() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_rate_limit_violations_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_rate_limit_violations_secure() FROM anon;
REVOKE EXECUTE ON FUNCTION public.regenerate_webhook_secret(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_webhook_secret(uuid, text) FROM anon;