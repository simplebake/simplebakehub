import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Header } from '@/components/Header';
import { Shield, FileText, ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * Allowed `SECURITY DEFINER` functions. Mirrors `.security-lint-allowlist.json`
 * and `docs/SECURITY.md`. Update both when this list changes.
 */
const ALLOWED_FUNCTIONS: Array<{
  name: string;
  purpose: string;
  protection: string;
  callableBy: 'authenticated' | 'admin (gated in body)';
}> = [
  {
    name: 'has_role(uuid, app_role)',
    purpose: 'Used by RLS USING clauses across nearly every table.',
    protection: 'Read-only existence check on user_roles; cannot escalate privileges.',
    callableBy: 'authenticated',
  },
  {
    name: 'has_any_role(uuid, app_role[])',
    purpose: 'Used by RLS policies that accept multiple roles (e.g. moderator OR admin).',
    protection: 'Same as has_role — read-only existence check.',
    callableBy: 'authenticated',
  },
  {
    name: 'has_permission(uuid, app_permission)',
    purpose: 'Powers granular permission RLS policies and the usePermissions hook.',
    protection: 'Reads role_permissions / user_permissions; cannot mutate state.',
    callableBy: 'authenticated',
  },
  {
    name: 'get_my_role_permissions()',
    purpose: 'Lets the client render permission-aware UI without exposing the underlying tables.',
    protection: "Returns only the caller's own permissions (auth.uid()).",
    callableBy: 'authenticated',
  },
  {
    name: 'regenerate_webhook_secret(uuid)',
    purpose: 'Admin tool for rotating a webhook signing secret.',
    protection: 'Body raises Access denied for non-admins; scoped to webhooks the caller owns; writes an audit_logs entry.',
    callableBy: 'admin (gated in body)',
  },
  {
    name: 'verify_webhook_secret(uuid, text)',
    purpose: 'Admin tool for confirming a stored secret matches a provided one.',
    protection: 'Same admin gate as regenerate; ownership-scoped; writes an audit_logs entry.',
    callableBy: 'admin (gated in body)',
  },
];

const AdminSecurity = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Security</h1>
          </div>
          <p className="text-muted-foreground">
            Allowed <code className="text-xs bg-muted px-1.5 py-0.5 rounded">SECURITY DEFINER</code> functions
            and how the CI security gate enforces them.
          </p>
          <a
            href="/SECURITY.md"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            aria-label="Open the full SECURITY.md document in a new tab"
          >
            <FileText className="h-4 w-4" />
            Open full SECURITY.md
          </a>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Accepted warnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{ALLOWED_FUNCTIONS.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Functions intentionally callable by signed-in users.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                CI gate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Any new linter finding that isn&apos;t in
                {' '}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.security-lint-allowlist.json</code>
                {' '}
                fails the build on push / PR to <code className="text-xs bg-muted px-1.5 py-0.5 rounded">main</code>.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Allowed SECURITY DEFINER functions</CardTitle>
            <CardDescription>
              These functions must remain executable by the listed role. Their justifications
              are documented in SECURITY.md and enforced by the CI allowlist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Function</TableHead>
                  <TableHead>Callable by</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Protection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ALLOWED_FUNCTIONS.map((fn) => (
                  <TableRow key={fn.name}>
                    <TableCell className="font-mono text-xs">{fn.name}</TableCell>
                    <TableCell>
                      <Badge variant={fn.callableBy === 'authenticated' ? 'secondary' : 'default'}>
                        {fn.callableBy}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fn.purpose}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fn.protection}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tests that lock this in</CardTitle>
            <CardDescription>Run via the edge-function test runner.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">supabase/functions/_rls_tests/rls_test.ts</code>
              {' '}— anon denial across protected tables; revoked EXECUTE on
              {' '}<code className="text-xs bg-muted px-1.5 py-0.5 rounded">has_role</code>,
              {' '}<code className="text-xs bg-muted px-1.5 py-0.5 rounded">has_permission</code>,
              {' '}<code className="text-xs bg-muted px-1.5 py-0.5 rounded">get_my_role_permissions</code>.
            </p>
            <p>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">webhook_admin_test.ts</code>
              {' '}— non-admins are rejected by both webhook helpers; admins succeed end-to-end.
            </p>
            <p>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">webhook_edge_cases_test.ts</code>
              {' '}— malformed UUIDs, wrong ownership, missing/empty secrets, cross-user RLS.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSecurity;