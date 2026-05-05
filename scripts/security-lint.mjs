#!/usr/bin/env node
/**
 * Security linter CI gate.
 *
 * Calls the Supabase Management API lints endpoint and fails the build if
 * any warning/error appears that is NOT in the allowlist. The allowlist
 * documents intentionally-accepted findings (e.g. RLS helper functions that
 * MUST remain executable by `authenticated`).
 *
 * Required env vars:
 *   SUPABASE_ACCESS_TOKEN  Personal access token (https://supabase.com/dashboard/account/tokens)
 *   SUPABASE_PROJECT_REF   Project ref (e.g. twszrhkovxpvosnfkdjk)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALLOWLIST_PATH = path.join(__dirname, "..", ".security-lint-allowlist.json");

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;

if (!token || !ref) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF env var.");
  process.exit(2);
}

const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"));
const allowed = new Set(
  allowlist.allowed.map((e) => `${e.name}::${e.detail}`)
);

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/database/lints`,
  { headers: { Authorization: `Bearer ${token}` } }
);

if (!res.ok) {
  console.error(`Supabase API error ${res.status}: ${await res.text()}`);
  process.exit(2);
}

const findings = await res.json();
const unexpected = [];
const matchedAllowlist = new Set();

for (const f of findings) {
  if (f.level !== "WARN" && f.level !== "ERROR") continue;
  const key = `${f.name}::${f.detail}`;
  if (allowed.has(key)) {
    matchedAllowlist.add(key);
  } else {
    unexpected.push(f);
  }
}

console.log(`Total findings: ${findings.length}`);
console.log(`Allowlisted matches: ${matchedAllowlist.size}/${allowed.size}`);
console.log(`Unexpected: ${unexpected.length}`);

if (unexpected.length > 0) {
  console.error("\n❌ Unexpected security findings detected:\n");
  for (const f of unexpected) {
    console.error(`- [${f.level}] ${f.name}`);
    console.error(`    ${f.detail}`);
    if (f.remediation) console.error(`    Fix: ${f.remediation}`);
  }
  console.error(
    "\nIf this finding is intentional, add it to .security-lint-allowlist.json with a justification."
  );
  process.exit(1);
}

console.log("\n✅ No unexpected security findings.");