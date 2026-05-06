/**
 * Unit + integration tests for security input validation:
 *  - Oversized / malformed image base64 payloads (analyze-bake-photo)
 *  - Blocked SSRF hostnames in outgoing webhook URLs (send-webhook)
 *  - Invalid recipient IDs in notify-comment / notify-like / notify-new-follower
 *
 * Pure-validator tests run in any environment. Edge-function calls are skipped
 * automatically when SUPABASE_URL / anon key are not configured.
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { validateOutgoingUrl, isPrivateHostname } from "../_shared/urlGuard.ts";
import { validateImageBase64, MAX_BASE64_LENGTH } from "../_shared/imageValidation.ts";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";

const TEST_OPTS = { sanitizeOps: false, sanitizeResources: false } as const;
const test = (name: string, fn: () => void | Promise<void>) =>
  Deno.test({ name, fn, ...TEST_OPTS });

// ---------------------------------------------------------------------------
// SSRF: blocked hostnames
// ---------------------------------------------------------------------------

const BLOCKED_URLS = [
  "http://localhost/hook",
  "http://127.0.0.1:8080/x",
  "http://0.0.0.0/",
  "http://10.0.0.5/",
  "http://192.168.1.1/",
  "http://172.16.0.1/",
  "http://172.31.255.255/",
  "http://169.254.169.254/latest/meta-data/", // cloud metadata
  "http://100.64.0.1/", // CGNAT
  "http://224.0.0.1/", // multicast
  "http://service.local/",
  "http://api.internal/",
  "http://[::1]/",
  "http://[fe80::1]/",
  "http://[fc00::1]/",
  "http://[fd12:3456::1]/",
];

const ALLOWED_URLS = [
  "https://hooks.example.com/path",
  "https://api.make.com/hook/abc",
  "http://example.org/webhook",
  "https://8.8.8.8/x",
];

test("SSRF guard: rejects loopback / private / link-local / metadata hosts", () => {
  for (const url of BLOCKED_URLS) {
    const r = validateOutgoingUrl(url);
    assert(!r.ok, `expected blocked: ${url}`);
  }
});

test("SSRF guard: allows public http(s) hosts", () => {
  for (const url of ALLOWED_URLS) {
    const r = validateOutgoingUrl(url);
    assert(r.ok, `expected allowed: ${url}`);
  }
});

test("SSRF guard: rejects non-http schemes", () => {
  for (const url of [
    "file:///etc/passwd",
    "gopher://evil/",
    "ftp://example.com/",
    "javascript:alert(1)",
  ]) {
    const r = validateOutgoingUrl(url);
    assert(!r.ok, `expected scheme reject: ${url}`);
  }
});

test("SSRF guard: rejects malformed URLs", () => {
  const r = validateOutgoingUrl("not a url");
  assert(!r.ok);
});

test("isPrivateHostname spot-checks", () => {
  assertEquals(isPrivateHostname("169.254.169.254"), true);
  assertEquals(isPrivateHostname("8.8.8.8"), false);
  assertEquals(isPrivateHostname("example.com"), false);
});

// ---------------------------------------------------------------------------
// Image payload validation
// ---------------------------------------------------------------------------

test("image validator: rejects empty/missing", () => {
  for (const v of [undefined, null, "", 0, {}]) {
    const r = validateImageBase64(v as unknown);
    assert(!r.ok, `expected reject: ${JSON.stringify(v)}`);
  }
});

test("image validator: rejects non-image data URI", () => {
  const r = validateImageBase64("data:text/plain;base64,aGVsbG8=");
  assert(!r.ok);
  assertEquals(r.ok ? -1 : r.status, 400);
});

test("image validator: rejects raw base64 without data URI prefix", () => {
  const r = validateImageBase64("iVBORw0KGgoAAAANSUhEUgAAAAUA");
  assert(!r.ok);
});

test("image validator: rejects oversized payload with 413", () => {
  const oversized = "data:image/png;base64," + "A".repeat(MAX_BASE64_LENGTH + 100);
  const r = validateImageBase64(oversized);
  assert(!r.ok);
  assertEquals(r.ok ? -1 : r.status, 413);
});

test("image validator: accepts well-formed small jpeg/png/webp", () => {
  for (const mime of ["jpeg", "png", "webp", "gif"]) {
    const r = validateImageBase64(`data:image/${mime};base64,AAAA`);
    assert(r.ok, `expected ok for ${mime}`);
  }
});

// ---------------------------------------------------------------------------
// Integration: notify-* recipient validation (skipped without env)
// ---------------------------------------------------------------------------

async function signedUpClient() {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });
  const email = `sec-${crypto.randomUUID()}@example.test`;
  const password = `Test!${crypto.randomUUID()}`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`signUp failed: ${error.message}`);
  return { client, userId: data.user!.id, token: data.session?.access_token ?? "" };
}

async function callFn(path: string, token: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
}

const integrationReady = !!SUPABASE_URL && !!ANON_KEY;

test("notify-comment: invalid bakeShareId returns 404", async () => {
  if (!integrationReady) return;
  const { userId, token } = await signedUpClient();
  if (!token) return; // email confirmation required
  const { status } = await callFn("notify-comment", token, {
    commenterId: userId,
    bakeShareId: crypto.randomUUID(),
    commentPreview: "hi",
  });
  assertEquals(status, 404);
});

test("notify-like: invalid bakeShareId returns 404", async () => {
  if (!integrationReady) return;
  const { userId, token } = await signedUpClient();
  if (!token) return;
  const { status } = await callFn("notify-like", token, {
    likerId: userId,
    bakeShareId: crypto.randomUUID(),
  });
  assertEquals(status, 404);
});

test("notify-new-follower: nonexistent follow row returns 404", async () => {
  if (!integrationReady) return;
  const { userId, token } = await signedUpClient();
  if (!token) return;
  const { status } = await callFn("notify-new-follower", token, {
    followerId: userId,
    followingId: crypto.randomUUID(),
  });
  assertEquals(status, 404);
});

test("notify-comment: identity mismatch returns 403", async () => {
  if (!integrationReady) return;
  const { token } = await signedUpClient();
  if (!token) return;
  const { status } = await callFn("notify-comment", token, {
    commenterId: crypto.randomUUID(), // not us
    bakeShareId: crypto.randomUUID(),
    commentPreview: "hi",
  });
  assertEquals(status, 403);
});

test("analyze-bake-photo: oversized payload rejected with 413", async () => {
  if (!integrationReady) return;
  const { token } = await signedUpClient();
  if (!token) return;
  const oversized = "data:image/png;base64," + "A".repeat(MAX_BASE64_LENGTH + 100);
  const { status } = await callFn("analyze-bake-photo", token, { imageBase64: oversized });
  assertEquals(status, 413);
});

test("analyze-bake-photo: invalid format rejected with 400", async () => {
  if (!integrationReady) return;
  const { token } = await signedUpClient();
  if (!token) return;
  const { status } = await callFn("analyze-bake-photo", token, {
    imageBase64: "not-a-data-uri",
  });
  assertEquals(status, 400);
});
