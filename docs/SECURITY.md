# Security Notes

This project uses strict Row-Level Security (RLS) on every public table and gates
sensitive logic through `SECURITY DEFINER` helper functions. The Supabase
security linter inspects only the `EXECUTE` GRANTs on functions — it cannot see
in-function authorisation checks. As a result, a small number of `WARN`
findings are **expected and intentional**.

## Accepted `SECURITY DEFINER` warnings

The following six functions must remain callable by the `authenticated` role.
They are documented here and in [`.security-lint-allowlist.json`](../.security-lint-allowlist.json),
which the CI security linter (`scripts/security-lint.mjs`) uses to fail the
build on any *new* warning.

| Function | Why it is exposed | How it is protected |
|---|---|---|
| `has_role(uuid, app_role)` | Called by RLS `USING` clauses across nearly every table. | Read-only existence check on `user_roles`; cannot be used to escalate. |
| `has_any_role(uuid, app_role[])` | Used by RLS policies that accept multiple roles (e.g. moderator OR admin). | Same as `has_role` — read-only existence check. |
| `has_permission(uuid, app_permission)` | Powers granular permission RLS policies and the `usePermissions` hook. | Reads from `role_permissions` / `user_permissions`; cannot mutate state. |
| `get_my_role_permissions()` | Lets the client render permission-aware UI without exposing the underlying tables. | Returns **only** the caller's own permissions (`auth.uid()`). |
| `regenerate_webhook_secret(uuid)` | Admin tool for rotating a webhook's signing secret. | First line of the body is `IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION` — non-admins are rejected at runtime. Also scoped to webhooks the caller owns. |
| `verify_webhook_secret(uuid, text)` | Admin tool for confirming a stored secret matches a provided one. | Same admin gate as `regenerate_webhook_secret`, plus an ownership check. |

All other `SECURITY DEFINER` helpers (e.g. `cleanup_*`, `update_updated_at_column`,
`handle_new_user`, the rate-limit reporters) have had `EXECUTE` revoked from
`anon` and `authenticated` and are only invocable by triggers or the service
role.

## Tests that lock this in

- `supabase/functions/_rls_tests/rls_test.ts` — verifies anon is denied on
  every protected table and that `has_role`, `has_permission`, and
  `get_my_role_permissions` cannot be executed by anon.
- `supabase/functions/_rls_tests/webhook_admin_test.ts` — verifies that
  non-admin authenticated users are rejected by both
  `regenerate_webhook_secret` and `verify_webhook_secret`, and (when a
  service-role key is present) that an admin can successfully rotate and
  verify a webhook secret end-to-end.

## CI gate

The GitHub Actions workflow [`.github/workflows/security-lint.yml`](../.github/workflows/security-lint.yml)
runs the Supabase linter on every push and PR to `main`. Any finding **not**
listed in `.security-lint-allowlist.json` fails the build. To accept a new
warning, add an entry with a clear justification.

## Reporting

If you discover a security issue not covered here, please open a private
report to the maintainers rather than a public issue.