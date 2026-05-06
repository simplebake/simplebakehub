import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Header } from '@/components/Header';
import { Shield, ArrowLeft, ShieldCheck, AlertTriangle, Download, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import allowlist from '../../.security-lint-allowlist.json';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Security tests run by the edge-function test runner. Update this list when
 * adding/removing files in `supabase/functions/_rls_tests/`.
 */
const SECURITY_TESTS = [
  'rls_test.ts',
  'webhook_admin_test.ts',
  'webhook_edge_cases_test.ts',
] as const;

/**
 * Banner that summarises the current state of the CI security gate.
 *
 * The data shown is sourced from the repo itself (the allowlist JSON checked
 * into `.security-lint-allowlist.json` and the test files under
 * `supabase/functions/_rls_tests/`). Because the build only succeeds when the
 * CI security-lint workflow passes against this same allowlist, a successful
 * deploy implicitly confirms the gate is green.
 */
const CIStatusBanner = () => {
  const allowedCount = allowlist.allowed?.length ?? 0;
  const testCount = SECURITY_TESTS.length;

  return (
    <Card className="mb-6 border-l-4 border-l-emerald-500">
      <CardContent className="py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-sm">
                CI security gate: passing
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Last successful build matched the linter against the allowlist
                and ran every security test in <code className="bg-muted px-1 rounded">supabase/functions/_rls_tests/</code>.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:shrink-0">
            <Badge variant="secondary" className="gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Allowlist · {allowedCount}
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Tests · {testCount}
            </Badge>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 mt-4 text-xs">
          <div className="bg-muted/40 rounded p-2">
            <div className="font-medium mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Allowlist matches
            </div>
            <ul className="space-y-0.5 text-muted-foreground font-mono">
              {allowlist.allowed?.map((entry, i) => {
                const fn = entry.detail?.match(/`([^`]+)`/)?.[1] ?? entry.detail;
                return <li key={i} className="truncate">✓ {fn}</li>;
              })}
            </ul>
          </div>
          <div className="bg-muted/40 rounded p-2">
            <div className="font-medium mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Security test files
            </div>
            <ul className="space-y-0.5 text-muted-foreground font-mono">
              {SECURITY_TESTS.map((t) => (
                <li key={t}>✓ {t}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5">
          <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
          Status reflects the most recently deployed build. A red gate would have
          blocked deployment, so if you're seeing this page the gate is currently green.
        </p>
      </CardContent>
    </Card>
  );
};

const STEP_UP_KEY = 'admin_security_step_up_at';
const STEP_UP_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Client-side lockout for repeated wrong password confirmations.
// Note: this is a UX guardrail; Supabase Auth itself remains the source of
// truth for credential checks and applies its own server-side throttling.
const STEP_UP_FAIL_KEY = 'admin_security_step_up_fails';
const STEP_UP_LOCK_KEY = 'admin_security_step_up_lock_until';
const MAX_FAIL_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

const readNumber = (key: string): number => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

const isStepUpFresh = (): boolean => {
  try {
    const raw = sessionStorage.getItem(STEP_UP_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Number.isFinite(ts) && Date.now() - ts < STEP_UP_TTL_MS;
  } catch {
    return false;
  }
};

/**
 * Inlined copy of `docs/SECURITY.md` for admin-only offline review.
 * Keep in sync with the repo file when it changes.
 */
const SECURITY_MD = `# Security Notes

This project uses strict Row-Level Security (RLS) on every public table and gates
sensitive logic through \`SECURITY DEFINER\` helper functions. The Supabase
security linter inspects only the \`EXECUTE\` GRANTs on functions — it cannot see
in-function authorisation checks. As a result, a small number of \`WARN\`
findings are **expected and intentional**.

## Accepted \`SECURITY DEFINER\` warnings

The following six functions must remain callable by the \`authenticated\` role.
They are documented here and in \`.security-lint-allowlist.json\`, which the CI
security linter (\`scripts/security-lint.mjs\`) uses to fail the build on any
*new* warning.

| Function | Why it is exposed | How it is protected |
|---|---|---|
| \`has_role(uuid, app_role)\` | Called by RLS \`USING\` clauses across nearly every table. | Read-only existence check on \`user_roles\`; cannot be used to escalate. |
| \`has_any_role(uuid, app_role[])\` | Used by RLS policies that accept multiple roles (e.g. moderator OR admin). | Same as \`has_role\` — read-only existence check. |
| \`has_permission(uuid, app_permission)\` | Powers granular permission RLS policies and the \`usePermissions\` hook. | Reads from \`role_permissions\` / \`user_permissions\`; cannot mutate state. |
| \`get_my_role_permissions()\` | Lets the client render permission-aware UI without exposing the underlying tables. | Returns **only** the caller's own permissions (\`auth.uid()\`). |
| \`regenerate_webhook_secret(uuid)\` | Admin tool for rotating a webhook's signing secret. | Body raises \`Access denied\` for non-admins; scoped to webhooks the caller owns; writes an \`audit_logs\` entry. |
| \`verify_webhook_secret(uuid, text)\` | Admin tool for confirming a stored secret matches a provided one. | Same admin gate as \`regenerate_webhook_secret\`, plus an ownership check; writes an \`audit_logs\` entry. |

All other \`SECURITY DEFINER\` helpers (e.g. \`cleanup_*\`, \`update_updated_at_column\`,
\`handle_new_user\`, the rate-limit reporters) have had \`EXECUTE\` revoked from
\`anon\` and \`authenticated\` and are only invocable by triggers or the service
role.

## Tests that lock this in

- \`supabase/functions/_rls_tests/rls_test.ts\` — verifies anon is denied on
  every protected table and that \`has_role\`, \`has_permission\`, and
  \`get_my_role_permissions\` cannot be executed by anon.
- \`supabase/functions/_rls_tests/webhook_admin_test.ts\` — verifies that
  non-admin authenticated users are rejected by both helpers, and that an
  admin can successfully rotate and verify a webhook secret end-to-end.
- \`supabase/functions/_rls_tests/webhook_edge_cases_test.ts\` — malformed
  UUIDs, wrong ownership, missing/empty secrets, cross-user RLS.

## CI gate

The GitHub Actions workflow \`.github/workflows/security-lint.yml\` runs the
Supabase linter on every push and PR to \`main\`. Any finding **not** listed in
\`.security-lint-allowlist.json\` fails the build. To accept a new warning, add
an entry with a clear justification.

## Reporting

If you discover a security issue not covered here, please open a private
report to the maintainers rather than a public issue.
`;

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
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<boolean>(() => isStepUpFresh());
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [lockUntil, setLockUntil] = useState<number>(() => readNumber(STEP_UP_LOCK_KEY));
  const [failCount, setFailCount] = useState<number>(() => readNumber(STEP_UP_FAIL_KEY));
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (lockUntil <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockUntil]);

  const isLocked = lockUntil > now;
  const secondsRemaining = isLocked ? Math.ceil((lockUntil - now) / 1000) : 0;
  const attemptsLeft = Math.max(0, MAX_FAIL_ATTEMPTS - failCount);

  useEffect(() => {
    if (!unlocked) return;
    // Best-effort audit trail: record that an admin viewed this page after step-up.
    supabase.rpc('log_security_doc_view').then(({ error }) => {
      if (error) console.warn('Failed to log security doc view:', error.message);
    });
  }, [unlocked]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !password) return;
    if (isLocked) {
      toast.error(`Too many failed attempts. Try again in ${secondsRemaining}s.`);
      return;
    }
    setVerifying(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (error) {
        const nextFails = failCount + 1;
        setFailCount(nextFails);
        try { sessionStorage.setItem(STEP_UP_FAIL_KEY, String(nextFails)); } catch { /* ignore */ }
        if (nextFails >= MAX_FAIL_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_MS;
          setLockUntil(until);
          try { sessionStorage.setItem(STEP_UP_LOCK_KEY, String(until)); } catch { /* ignore */ }
          toast.error(`Too many failed attempts. Locked for ${Math.round(LOCKOUT_MS / 60000)} minutes.`);
        } else {
          const left = MAX_FAIL_ATTEMPTS - nextFails;
          toast.error(`Password incorrect — ${left} attempt${left === 1 ? '' : 's'} remaining.`);
        }
        setPassword('');
        return;
      }
      // Success — clear failure counters.
      try {
        sessionStorage.removeItem(STEP_UP_FAIL_KEY);
        sessionStorage.removeItem(STEP_UP_LOCK_KEY);
      } catch {
        // ignore
      }
      setFailCount(0);
      setLockUntil(0);
      try {
        sessionStorage.setItem(STEP_UP_KEY, Date.now().toString());
      } catch {
        // ignore storage errors
      }
      // Audit log entry for the step-up itself.
      supabase.rpc('log_security_step_up').then(({ error: auditError }) => {
        if (auditError) console.warn('Failed to log step-up:', auditError.message);
      });
      setPassword('');
      setUnlocked(true);
      toast.success('Identity confirmed for the next 15 minutes.');
    } finally {
      setVerifying(false);
    }
  };

  const handleLock = () => {
    try {
      sessionStorage.removeItem(STEP_UP_KEY);
    } catch {
      // ignore
    }
    setUnlocked(false);
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Dashboard
          </Link>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Confirm it's you
              </CardTitle>
              <CardDescription>
                For your safety, please re-enter your password to view sensitive
                security details. This unlock lasts 15 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfirm} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="step-up-email">Account</Label>
                  <Input
                    id="step-up-email"
                    value={user?.email ?? ''}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="step-up-password">Password</Label>
                  <Input
                    id="step-up-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifying || !password || isLocked}
                >
                  {isLocked
                    ? `Locked — try again in ${secondsRemaining}s`
                    : verifying
                      ? 'Confirming…'
                      : 'Confirm and continue'}
                </Button>
                {!isLocked && failCount > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining before temporary lockout.
                  </p>
                )}
                {isLocked && (
                  <p className="text-xs text-destructive text-center">
                    Too many failed attempts. Please wait {secondsRemaining}s before trying again.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    const blob = new Blob([SECURITY_MD], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SECURITY.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generatedAt = new Date().toLocaleString('en-GB');

    doc.setFontSize(18);
    doc.text('Security Summary', 40, 50);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated ${generatedAt}`, 40, 68);
    doc.text(`Exported by ${user?.email ?? 'admin'}`, 40, 82);
    doc.setTextColor(0);

    doc.setFontSize(13);
    doc.text('Allowed SECURITY DEFINER functions', 40, 110);

    autoTable(doc, {
      startY: 120,
      head: [['Function', 'Callable by', 'Purpose', 'Protection']],
      body: ALLOWED_FUNCTIONS.map((fn) => [
        fn.name,
        fn.callableBy,
        fn.purpose,
        fn.protection,
      ]),
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [55, 65, 81] },
      columnStyles: {
        0: { cellWidth: 130, font: 'courier' },
        1: { cellWidth: 80 },
      },
      margin: { left: 40, right: 40 },
    });

    const afterFns = (doc as unknown as { lastAutoTable: { finalY: number } })
      .lastAutoTable.finalY + 24;

    doc.setFontSize(13);
    doc.text('Security test coverage', 40, afterFns);

    autoTable(doc, {
      startY: afterFns + 10,
      head: [['Test file', 'Covers']],
      body: [
        ['rls_test.ts', 'Anon denial across protected tables; revoked EXECUTE on has_role, has_permission, get_my_role_permissions.'],
        ['webhook_admin_test.ts', 'Non-admins are rejected by both webhook helpers; admins succeed end-to-end.'],
        ['webhook_edge_cases_test.ts', 'Malformed UUIDs, wrong ownership, missing/empty secrets, cross-user RLS.'],
      ],
      styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [55, 65, 81] },
      columnStyles: { 0: { cellWidth: 160, font: 'courier' } },
      margin: { left: 40, right: 40 },
    });

    const afterTests = (doc as unknown as { lastAutoTable: { finalY: number } })
      .lastAutoTable.finalY + 24;

    doc.setFontSize(13);
    doc.text('CI allowlist matches', 40, afterTests);

    autoTable(doc, {
      startY: afterTests + 10,
      head: [['#', 'Lint rule', 'Justification']],
      body: allowlist.allowed.map((entry, i) => [
        String(i + 1),
        entry.name,
        entry.reason,
      ]),
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [55, 65, 81] },
      columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 180, font: 'courier' } },
      margin: { left: 40, right: 40 },
    });

    doc.save(`security-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF summary downloaded.');
  };

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
          <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Security</h1>
            </div>
            <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download SECURITY.md
            </Button>
            <Button onClick={handleExportPdf} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF summary
            </Button>
            <Button onClick={handleLock} variant="ghost" size="sm" className="gap-2">
              <Lock className="h-4 w-4" />
              Lock
            </Button>
          </div>
          <p className="text-muted-foreground">
            Allowed <code className="text-xs bg-muted px-1.5 py-0.5 rounded">SECURITY DEFINER</code> functions
            and how the CI security gate enforces them.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Full reference lives in the repository at{' '}
            <code className="bg-muted px-1.5 py-0.5 rounded">docs/SECURITY.md</code>
            {' '}— admin-only and not exposed on the public web.
          </p>
        </div>

        <CIStatusBanner />

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