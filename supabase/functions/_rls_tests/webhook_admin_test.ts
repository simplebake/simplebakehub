/**
 * Backend tests for the admin-gated SECURITY DEFINER webhook helpers.
 *
 * Verifies:
 *  - Non-admin authenticated users are rejected by `regenerate_webhook_secret`
 *    and `verify_webhook_secret` (RAISE EXCEPTION 'Access denied').
 *  - When a service-role key is available, an admin user can successfully
 *    call both functions end-to-end.
 *
 * Run with: supabase--test_edge_functions ({ functions: ["_rls_tests"] }).
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const TEST_OPTS = { sanitizeOps: false, sanitizeResources: false } as const;
const test = (name: string, fn: () => void | Promise<void>) =>
  Deno.test({ name, fn, ...TEST_OPTS });

async function signedUpClient() {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });
  const email = `webhook-admin-test-${crypto.randomUUID()}@example.test`;
  const password = `Test!${crypto.randomUUID()}`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`signUp failed: ${error.message}`);
  return { client, userId: data.user!.id, email, password };
}

function assertAdminDenied(error: { message: string } | null) {
  assert(error, "expected admin-gated call to be denied");
  assert(
    /admin/i.test(error!.message) || /denied/i.test(error!.message),
    `unexpected error message: ${error!.message}`,
  );
}

// ---------------------------------------------------------------------------
// Non-admin authenticated users are rejected
// ---------------------------------------------------------------------------

test("non-admin: regenerate_webhook_secret is rejected", async () => {
  const { client } = await signedUpClient();
  const { error } = await client.rpc("regenerate_webhook_secret", {
    _config_id: "00000000-0000-0000-0000-000000000000",
  });
  assertAdminDenied(error);
});

test("non-admin: verify_webhook_secret is rejected", async () => {
  const { client } = await signedUpClient();
  const { error } = await client.rpc("verify_webhook_secret", {
    _config_id: "00000000-0000-0000-0000-000000000000",
    _provided_secret: "irrelevant",
  });
  assertAdminDenied(error);
});

// ---------------------------------------------------------------------------
// Admin success path (requires SUPABASE_SERVICE_ROLE_KEY in env)
// ---------------------------------------------------------------------------

if (!SERVICE_ROLE_KEY) {
  test("admin success path: SKIPPED (no SUPABASE_SERVICE_ROLE_KEY)", () => {
    console.warn(
      "Skipping admin success tests — set SUPABASE_SERVICE_ROLE_KEY in .env to run them.",
    );
  });
} else {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  test("admin: regenerate_webhook_secret returns a fresh secret", async () => {
    // 1) Create a fresh user, promote to admin, seed a webhook_config they own.
    const { client, userId, email, password } = await signedUpClient();
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    assertEquals(roleErr, null);

    const initialSecret = "init_" + crypto.randomUUID().replace(/-/g, "");
    const { data: cfg, error: cfgErr } = await admin
      .from("webhook_configs")
      .insert({
        user_id: userId,
        name: "rls-test-cfg",
        webhook_url: "https://example.test/webhook",
        secret_key: initialSecret,
      })
      .select("id")
      .single();
    assertEquals(cfgErr, null);
    const configId = cfg!.id as string;

    try {
      // 2) Sign in as the (now-admin) user and call regenerate.
      const { error: signInErr } = await client.auth.signInWithPassword({
        email,
        password,
      });
      assertEquals(signInErr, null);

      const { data: newSecret, error } = await client.rpc(
        "regenerate_webhook_secret",
        { _config_id: configId },
      );
      assertEquals(error, null);
      assert(typeof newSecret === "string" && newSecret.length === 64);
      assert(newSecret !== initialSecret);

      // 3) verify_webhook_secret should accept the new secret and reject a wrong one.
      const { data: ok, error: vOkErr } = await client.rpc(
        "verify_webhook_secret",
        { _config_id: configId, _provided_secret: newSecret },
      );
      assertEquals(vOkErr, null);
      assertEquals(ok, true);

      const { data: notOk, error: vBadErr } = await client.rpc(
        "verify_webhook_secret",
        { _config_id: configId, _provided_secret: "definitely-wrong" },
      );
      assertEquals(vBadErr, null);
      assertEquals(notOk, false);
    } finally {
      await admin.from("webhook_configs").delete().eq("id", configId);
      await admin.from("user_roles").delete().eq("user_id", userId);
    }
  });
}