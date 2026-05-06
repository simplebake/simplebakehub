import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Header } from '@/components/Header';
import { Shield, ArrowLeft, ShieldCheck, AlertTriangle, Download, Lock, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';
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
 * Allowlist entries (matched on the bare function name) that the CI gate
 * expects to find in `.security-lint-allowlist.json`. If any of these are
 * missing or unexpected entries appear, the gate is treated as failing and
 * the banner surfaces the diff so an admin can fix it quickly.
 */
const EXPECTED_ALLOWLIST_FUNCTIONS = [
  'public.has_role',
  'public.has_any_role',
  'public.has_permission',
  'public.get_my_role_permissions',
  'public.regenerate_webhook_secret',
  'public.verify_webhook_secret',
  'public.log_security_doc_view',
  'public.log_moderation_action',
  'public.log_security_step_up',
] as const;

/**
 * Test files that MUST exist in `supabase/functions/_rls_tests/` for the CI
 * gate to be considered green.
 */
const EXPECTED_SECURITY_TESTS = [
  'rls_test.ts',
  'webhook_admin_test.ts',
  'webhook_edge_cases_test.ts',
] as const;

type GateIssue = {
  kind: 'missing-allowlist' | 'extra-allowlist' | 'missing-test' | 'extra-test';
  label: string;
};

const computeGateIssues = (): GateIssue[] => {
  const issues: GateIssue[] = [];

  const presentAllowlist = new Set(
    (allowlist.allowed ?? []).map((entry) => {
      const m = entry.detail?.match(/`([^`]+)`/);
      // Normalise escaped backticks / paths (e.g. "\\`public.has_role\\`")
      return m ? m[1] : (entry.detail ?? '').replace(/\\`/g, '').trim();
    }),
  );

  for (const expected of EXPECTED_ALLOWLIST_FUNCTIONS) {
    if (!presentAllowlist.has(expected)) {
      issues.push({ kind: 'missing-allowlist', label: expected });
    }
  }
  for (const present of presentAllowlist) {
    if (!EXPECTED_ALLOWLIST_FUNCTIONS.includes(present as typeof EXPECTED_ALLOWLIST_FUNCTIONS[number])) {
      issues.push({ kind: 'extra-allowlist', label: present });
    }
  }

  const presentTests = new Set<string>(SECURITY_TESTS);
  for (const expected of EXPECTED_SECURITY_TESTS) {
    if (!presentTests.has(expected)) {
      issues.push({ kind: 'missing-test', label: expected });
    }
  }
  for (const present of presentTests) {
    if (!EXPECTED_SECURITY_TESTS.includes(present as typeof EXPECTED_SECURITY_TESTS[number])) {
      issues.push({ kind: 'extra-test', label: present });
    }
  }

  return issues;
};

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
  const [checkedAt, setCheckedAt] = useState<Date>(() => new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [issues, setIssues] = useState<GateIssue[]>(() => computeGateIssues());
  const passing = issues.length === 0;
  const issueKey = (i: GateIssue) => `${i.kind}::${i.label}`;
  const RESOLVED_STORAGE_KEY = 'admin-security:ci-gate-resolved-v1';
  const [resolved, setResolved] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(RESOLVED_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(RESOLVED_STORAGE_KEY, JSON.stringify(resolved));
    } catch {
      /* ignore quota/SSR errors */
    }
  }, [resolved]);
  // Drop resolved keys that no longer correspond to a current issue so the
  // checklist stays in sync as CI re-runs add or remove items.
  useEffect(() => {
    setResolved((prev) => {
      const valid = new Set(issues.map(issueKey));
      const next: Record<string, boolean> = {};
      let changed = false;
      for (const [k, v] of Object.entries(prev)) {
        if (valid.has(k)) next[k] = v;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [issues]);
  const toggleResolved = (i: GateIssue) =>
    setResolved((prev) => ({ ...prev, [issueKey(i)]: !prev[issueKey(i)] }));
  const isResolved = (i: GateIssue) => Boolean(resolved[issueKey(i)]);
  const resolvedCount = issues.filter(isResolved).length;
  const progressPct = issues.length === 0 ? 100 : Math.round((resolvedCount / issues.length) * 100);
  const allResolved = issues.length > 0 && resolvedCount === issues.length;
  const resetChecklist = () => setResolved({});
  const [remoteStatus, setRemoteStatus] = useState<{
    status: 'passing' | 'failing' | 'unknown';
    commit_sha: string | null;
    ci_run_url: string | null;
    build_time: string | null;
    checked_at: string;
    issues: GateIssue[];
  } | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(true);
  const buildTime = (() => {
    try {
      return new Date(__BUILD_TIME__);
    } catch {
      return null;
    }
  })();
  const ciRunUrl =
    remoteStatus?.ci_run_url ??
    (typeof __CI_RUN_URL__ === 'string' && __CI_RUN_URL__.length > 0 ? __CI_RUN_URL__ : null);

  const fetchRemote = async () => {
    setLoadingRemote(true);
    setRemoteError(null);
    try {
      const { data, error } = await supabase.functions.invoke('ci-security-status', {
        method: 'GET',
      });
      if (error) throw error;
      const row = (data as { status: typeof remoteStatus | null })?.status ?? null;
      if (row) {
        setRemoteStatus(row);
      } else {
        setRemoteStatus(null);
      }
    } catch (e) {
      setRemoteError(e instanceof Error ? e.message : 'Failed to load CI status');
    } finally {
      setLoadingRemote(false);
    }
  };

  useEffect(() => {
    fetchRemote();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const next = computeGateIssues();
      setIssues(next);
      await fetchRemote();
      setCheckedAt(new Date());
      if (next.length === 0) {
        toast.success('CI security status re-checked — gate still passing.');
      } else {
        toast.error(`CI gate failing — ${next.length} issue${next.length === 1 ? '' : 's'} detected.`);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const missingAllowlist = issues.filter((i) => i.kind === 'missing-allowlist');
  const extraAllowlist = issues.filter((i) => i.kind === 'extra-allowlist');
  const missingTests = issues.filter((i) => i.kind === 'missing-test');
  const extraTests = issues.filter((i) => i.kind === 'extra-test');

  type Recommendation = {
    summary: string;
    file: string;
    locator: string;
    snippet?: string;
    altFile?: string;
    altLocator?: string;
    altSnippet?: string;
    rootCause?: { headline: string; detail: string };
  };

  // --- Likely root-cause detection -----------------------------------------
  const normaliseFnName = (s: string) => s.replace(/^public\./, '').toLowerCase();
  const normaliseTestName = (s: string) =>
    s.toLowerCase().replace(/\.(test|spec)\.ts$/, '').replace(/_test\.ts$/, '').replace(/\.ts$/, '');

  const levenshtein = (a: string, b: string): number => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
    for (let j = 1; j <= b.length; j++) {
      let prev = dp[0];
      dp[0] = j;
      for (let i = 1; i <= a.length; i++) {
        const tmp = dp[i];
        dp[i] = a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[i], dp[i - 1]);
        prev = tmp;
      }
    }
    return dp[a.length];
  };

  const similarity = (a: string, b: string) => {
    const max = Math.max(a.length, b.length) || 1;
    return 1 - levenshtein(a, b) / max;
  };

  const detectRootCause = (
    issue: GateIssue,
  ): Recommendation['rootCause'] | undefined => {
    if (issue.kind === 'missing-allowlist' || issue.kind === 'extra-allowlist') {
      const counterpartKind: GateIssue['kind'] =
        issue.kind === 'missing-allowlist' ? 'extra-allowlist' : 'missing-allowlist';
      const target = normaliseFnName(issue.label);
      let best: { label: string; score: number } | undefined;
      for (const other of issues) {
        if (other.kind !== counterpartKind) continue;
        const score = similarity(target, normaliseFnName(other.label));
        if (!best || score > best.score) best = { label: other.label, score };
      }
      if (best && best.score >= 0.6) {
        return {
          headline: 'Likely renamed function',
          detail:
            issue.kind === 'missing-allowlist'
              ? `\`${best.label}\` looks like the new name for \`${issue.label}\` (${Math.round(best.score * 100)}% match). Update EXPECTED_ALLOWLIST_FUNCTIONS to reference \`${best.label}\` instead.`
              : `\`${issue.label}\` looks like a rename of \`${best.label}\` (${Math.round(best.score * 100)}% match). Update EXPECTED_ALLOWLIST_FUNCTIONS to use the new name, then remove the stale entry.`,
        };
      }
      // Schema/prefix change detection (public. → something else, or vice versa)
      const stripped = issue.label.replace(/^[a-z_]+\./, '');
      const counterpart = issues.find(
        (o) =>
          o.kind === counterpartKind &&
          o.label.replace(/^[a-z_]+\./, '') === stripped &&
          o.label !== issue.label,
      );
      if (counterpart) {
        return {
          headline: 'Likely changed schema/prefix',
          detail: `Same function name \`${stripped}\` appears with a different schema prefix (\`${issue.label}\` vs \`${counterpart.label}\`). Align the prefix in EXPECTED_ALLOWLIST_FUNCTIONS and the allowlist JSON.`,
        };
      }
      if (issue.kind === 'extra-allowlist' && issues.every((o) => o.kind !== 'missing-allowlist')) {
        return {
          headline: 'Likely stale EXPECTED list',
          detail: `No matching missing entry — EXPECTED_ALLOWLIST_FUNCTIONS in AdminSecurity.tsx probably needs \`${issue.label}\` added (function added intentionally) or the JSON entry removed.`,
        };
      }
    }

    if (issue.kind === 'missing-test' || issue.kind === 'extra-test') {
      const counterpartKind: GateIssue['kind'] =
        issue.kind === 'missing-test' ? 'extra-test' : 'missing-test';
      const target = normaliseTestName(issue.label);
      let best: { label: string; score: number } | undefined;
      for (const other of issues) {
        if (other.kind !== counterpartKind) continue;
        const score = similarity(target, normaliseTestName(other.label));
        if (!best || score > best.score) best = { label: other.label, score };
      }
      if (best && best.score >= 0.65) {
        // Detect naming-convention shift (foo_test.ts ↔ foo.test.ts)
        const conventionShift =
          (/_test\.ts$/.test(issue.label) && /\.test\.ts$/.test(best.label)) ||
          (/\.test\.ts$/.test(issue.label) && /_test\.ts$/.test(best.label));
        return {
          headline: conventionShift ? 'Likely changed test naming convention' : 'Likely moved or renamed test file',
          detail: conventionShift
            ? `\`${issue.label}\` ↔ \`${best.label}\` differ only by the \`_test.ts\` vs \`.test.ts\` suffix. Pick one convention and update both EXPECTED_SECURITY_TESTS and the file on disk.`
            : `\`${best.label}\` looks like \`${issue.label}\` after a rename/move (${Math.round(best.score * 100)}% match). Update EXPECTED_SECURITY_TESTS / SECURITY_TESTS to the new filename, or rename the file back.`,
        };
      }
      if (issue.kind === 'extra-test' && issues.every((o) => o.kind !== 'missing-test')) {
        return {
          headline: 'Likely missing from expected list',
          detail: `\`${issue.label}\` exists on disk and no test is reported missing — EXPECTED_SECURITY_TESTS / SECURITY_TESTS just need \`${issue.label}\` added so CI runs it.`,
        };
      }
      if (issue.kind === 'missing-test' && issues.every((o) => o.kind !== 'extra-test')) {
        return {
          headline: 'Likely deleted test file',
          detail: `\`${issue.label}\` is in EXPECTED_SECURITY_TESTS but no replacement file is on disk — most likely it was deleted. Restore from git or remove from the expected list.`,
        };
      }
    }

    return undefined;
  };

  const recommendationFor = (kind: GateIssue['kind'], label: string): Recommendation => {
    const rootCause = detectRootCause({ kind, label });
    const base = (() => {
    switch (kind) {
      case 'missing-allowlist':
        return {
          summary: `Allowlist \`${label}\` (or revoke EXECUTE from authenticated).`,
          file: '.security-lint-allowlist.json',
          locator: 'top-level "functions" array (project root)',
          snippet: `{\n  "name": "${label}",\n  "justification": "<why authenticated users may EXECUTE this>",\n  "owner": "<team or user>"\n}`,
          altFile: `supabase/migrations/<new-timestamp>_revoke_${label}.sql`,
          altLocator: 'create a new migration if the function should not be exposed',
          altSnippet: `REVOKE EXECUTE ON FUNCTION public.${label} FROM authenticated;`,
        };
      case 'extra-allowlist':
        return {
          summary: `\`${label}\` is allowlisted but not in EXPECTED_ALLOWLIST_FUNCTIONS.`,
          file: '.security-lint-allowlist.json',
          locator: `remove the entry whose "name" === "${label}"`,
          altFile: 'src/pages/AdminSecurity.tsx',
          altLocator: 'EXPECTED_ALLOWLIST_FUNCTIONS constant (top of file)',
          altSnippet: `EXPECTED_ALLOWLIST_FUNCTIONS = [\n  …,\n  '${label}', // intentional — document why\n]`,
        };
      case 'missing-test':
        return {
          summary: `Test file ${label} is expected by CI but missing on disk.`,
          file: `supabase/functions/_rls_tests/${label}`,
          locator: 'restore from git history (e.g. `git log -- <path>` then `git checkout <sha>^ -- <path>`)',
          altFile: 'src/pages/AdminSecurity.tsx',
          altLocator: 'EXPECTED_SECURITY_TESTS / SECURITY_TESTS arrays',
          altSnippet: `// remove '${label}' from EXPECTED_SECURITY_TESTS and SECURITY_TESTS if retired on purpose`,
        };
      case 'extra-test':
        return {
          summary: `${label} exists on disk but CI does not expect it.`,
          file: 'src/pages/AdminSecurity.tsx',
          locator: 'EXPECTED_SECURITY_TESTS and SECURITY_TESTS arrays',
          snippet: `EXPECTED_SECURITY_TESTS = [\n  …,\n  '${label}',\n]\nSECURITY_TESTS = [\n  …,\n  { file: '${label}', /* description */ },\n]`,
          altFile: `supabase/functions/_rls_tests/${label}`,
          altLocator: 'delete the file if it is no longer needed',
          altSnippet: `rm supabase/functions/_rls_tests/${label}`,
        };
    }
    })();
    return { ...base, rootCause };
  };

  const RecommendationBlock = ({ rec }: { rec: Recommendation }) => (
    <div className="text-[11px] pl-3 text-muted-foreground/90 space-y-1 mt-0.5">
      {rec.rootCause && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-foreground">
          <div className="font-medium text-amber-700 dark:text-amber-400">
            🔎 {rec.rootCause.headline}
          </div>
          <div className="text-muted-foreground mt-0.5">{rec.rootCause.detail}</div>
        </div>
      )}
      <div>💡 {rec.summary}</div>
      <div>
        <span className="text-muted-foreground">Edit </span>
        <code className="bg-muted px-1 rounded">{rec.file}</code>
        <span className="text-muted-foreground"> — {rec.locator}</span>
      </div>
      {rec.snippet && (
        <pre className="bg-muted/60 rounded p-2 overflow-x-auto whitespace-pre text-[10.5px] leading-snug">{rec.snippet}</pre>
      )}
      {rec.altFile && (
        <div>
          <span className="text-muted-foreground">Or edit </span>
          <code className="bg-muted px-1 rounded">{rec.altFile}</code>
          {rec.altLocator && <span className="text-muted-foreground"> — {rec.altLocator}</span>}
        </div>
      )}
      {rec.altSnippet && (
        <pre className="bg-muted/60 rounded p-2 overflow-x-auto whitespace-pre text-[10.5px] leading-snug">{rec.altSnippet}</pre>
      )}
    </div>
  );

  const IssueChecklistItem = ({ issue, prefix }: { issue: GateIssue; prefix: '−' | '+' }) => {
    const done = isResolved(issue);
    const id = `ci-issue-${issueKey(issue)}`;
    return (
      <li className="flex items-start gap-2">
        <Checkbox
          id={id}
          checked={done}
          onCheckedChange={() => toggleResolved(issue)}
          aria-label={done ? `Mark ${issue.label} as not yet resolved` : `Mark ${issue.label} as resolved`}
          className="mt-1"
        />
        <div className={`flex-1 min-w-0 ${done ? 'opacity-60' : ''}`}>
          <label
            htmlFor={id}
            className={`font-mono cursor-pointer block ${done ? 'line-through text-muted-foreground' : ''}`}
          >
            {prefix} {issue.label}
          </label>
          {!done && <RecommendationBlock rec={recommendationFor(issue.kind, issue.label)} />}
          {done && (
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 pl-1 mt-0.5">
              ✓ Marked resolved — re-run CI to confirm.
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <Card className={`mb-6 border-l-4 ${passing ? 'border-l-emerald-500' : 'border-l-destructive'}`}>
      <CardContent className="py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            {passing ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-sm">
                {passing
                  ? 'CI security gate: passing'
                  : `CI security gate: failing (${issues.length} issue${issues.length === 1 ? '' : 's'})`}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {passing
                  ? <>Last successful build matched the linter against the allowlist and ran every security test in <code className="bg-muted px-1 rounded">supabase/functions/_rls_tests/</code>.</>
                  : <>The bundled allowlist or security test list does not match what CI expects. Review the diff below and update <code className="bg-muted px-1 rounded">.security-lint-allowlist.json</code> or <code className="bg-muted px-1 rounded">supabase/functions/_rls_tests/</code>.</>}
              </p>
              {buildTime && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Last successful build: {buildTime.toLocaleString()}
                </p>
              )}
              {ciRunUrl ? (
                <a
                  href={ciRunUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline mt-0.5 inline-flex items-center gap-1"
                >
                  View CI run <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                  CI run URL not configured (set <code className="bg-muted px-1 rounded">VITE_CI_RUN_URL</code> at build time).
                </p>
              )}
              {loadingRemote ? (
                <p className="text-[11px] text-muted-foreground mt-1 italic">
                  Loading latest CI status…
                </p>
              ) : remoteError ? (
                <p className="text-[11px] text-amber-600 mt-1">
                  Live CI status unavailable: {remoteError}
                </p>
              ) : remoteStatus ? (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Live CI: <span className={
                    remoteStatus.status === 'passing'
                      ? 'text-emerald-600 font-medium'
                      : remoteStatus.status === 'failing'
                        ? 'text-destructive font-medium'
                        : 'text-muted-foreground font-medium'
                  }>{remoteStatus.status}</span>
                  {remoteStatus.commit_sha && (
                    <> · commit <code className="bg-muted px-1 rounded">{remoteStatus.commit_sha.slice(0, 7)}</code></>
                  )}
                  {' · updated '}
                  {new Date(remoteStatus.checked_at).toLocaleString()}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1 italic">
                  No CI status reported yet — falling back to the bundled check.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Checked at {checkedAt.toLocaleTimeString()}
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
            {!passing && (
              <Badge variant="destructive" className="gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Issues · {issues.length}
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Re-check CI security-lint and security test status"
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>

        {!passing && (
          <div className="mt-4 rounded border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-destructive/20">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium text-foreground">
                    Resolution checklist
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {resolvedCount} / {issues.length} resolved · {progressPct}%
                  </span>
                </div>
                <Progress value={progressPct} className="h-1.5" aria-label="CI gate resolution progress" />
                {allResolved && (
                  <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                    🎉 All items ticked off locally. Commit, push, and use <span className="font-medium">Refresh</span> to re-check the live gate.
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetChecklist}
                disabled={resolvedCount === 0}
                className="shrink-0 h-7 text-[11px]"
                aria-label="Reset checklist progress"
              >
                Reset
              </Button>
            </div>
            {missingAllowlist.length > 0 && (
              <div>
                <div className="font-medium text-destructive mb-1">
                  Missing allowlist entries ({missingAllowlist.length})
                </div>
                <ul className="text-muted-foreground space-y-2">
                  {missingAllowlist.map((i) => (
                    <IssueChecklistItem key={`ma-${i.label}`} issue={i} prefix="−" />
                  ))}
                </ul>
              </div>
            )}
            {extraAllowlist.length > 0 && (
              <div>
                <div className="font-medium text-amber-600 mb-1">
                  Unexpected allowlist entries ({extraAllowlist.length})
                </div>
                <ul className="text-muted-foreground space-y-2">
                  {extraAllowlist.map((i) => (
                    <IssueChecklistItem key={`ea-${i.label}`} issue={i} prefix="+" />
                  ))}
                </ul>
              </div>
            )}
            {missingTests.length > 0 && (
              <div>
                <div className="font-medium text-destructive mb-1">
                  Missing security test files ({missingTests.length})
                </div>
                <ul className="text-muted-foreground space-y-2">
                  {missingTests.map((i) => (
                    <IssueChecklistItem key={`mt-${i.label}`} issue={i} prefix="−" />
                  ))}
                </ul>
              </div>
            )}
            {extraTests.length > 0 && (
              <div>
                <div className="font-medium text-amber-600 mb-1">
                  Unexpected security test files ({extraTests.length})
                </div>
                <ul className="text-muted-foreground space-y-2">
                  {extraTests.map((i) => (
                    <IssueChecklistItem key={`et-${i.label}`} issue={i} prefix="+" />
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-2 pt-2 border-t border-destructive/20 text-[11px] text-muted-foreground space-y-1">
              <div className="font-medium text-foreground">Next steps</div>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Run <code className="bg-muted px-1 rounded">node scripts/security-lint.mjs</code> locally to reproduce the failure.</li>
                <li>Update <code className="bg-muted px-1 rounded">.security-lint-allowlist.json</code> and/or <code className="bg-muted px-1 rounded">supabase/functions/_rls_tests/</code> per the hints above.</li>
                <li>Re-run <code className="bg-muted px-1 rounded">deno test -A supabase/functions/_rls_tests/</code> to confirm tests pass.</li>
                <li>Commit, push, and watch the <code className="bg-muted px-1 rounded">.github/workflows/security-lint.yml</code> run go green.</li>
              </ol>
            </div>
          </div>
        )}

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
          {passing
            ? "Status reflects the most recently deployed build. A red gate would have blocked deployment, so if you're seeing this page the gate is currently green."
            : 'The bundled allowlist or test list drifted from CI expectations. Resolve the diff above so the next CI run stays green.'}
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
  const { hasPermission, loading: permsLoading } = usePermissions();
  const canExportSecuritySummary = hasPermission('can_export_security_summary');
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
    if (!canExportSecuritySummary) {
      toast.error('You do not have permission to export security summaries.');
      return;
    }
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
    if (!canExportSecuritySummary) {
      toast.error('You do not have permission to export security summaries.');
      return;
    }
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

    // Apply a diagonal watermark to every page identifying the exporter and
    // the generation time. This is a deterrent / audit aid — it does not
    // replace the audit_logs entry written when the export is triggered.
    const exporter = user?.email ?? 'admin';
    const watermarkText = `CONFIDENTIAL · ${exporter} · ${generatedAt}`;
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.saveGraphicsState();
      // jsPDF GState gives us a true alpha channel.
      const gState = (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState;
      (doc as unknown as { setGState: (g: unknown) => void }).setGState(new gState({ opacity: 0.12 }));
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(48);
      doc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 35,
      });
      // Bottom-of-page footer (full opacity, small) for legibility on print.
      doc.restoreGraphicsState();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Exported by ${exporter} · ${generatedAt} · Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' },
      );
    }

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
            {canExportSecuritySummary ? (
              <>
                <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download SECURITY.md
                </Button>
                <Button onClick={handleExportPdf} variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export PDF summary
                </Button>
              </>
            ) : !permsLoading ? (
              <p
                className="text-xs text-muted-foreground italic"
                title="Requires the 'Export Security Summaries' permission. An admin can grant this in Permissions Manager."
              >
                Export disabled — missing permission
              </p>
            ) : null}
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