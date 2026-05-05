/**
 * Edge-case tests for the admin-gated webhook helpers and adjacent RLS rules.
 *
 * Covers:
 *  - Malformed inputs (invalid UUID strings, missing args).
 *  - Non-existent / "expired" config IDs (random UUIDs that don't exist).
 *  - Wrong ownership: an admin trying to operate on a webhook owned by
 *    another user must be rejected by the function's ownership check.
 *  - verify_webhook_secret: wrong secret returns false; correct secret returns true.
 *  - RLS on webhook_configs: an authenticated user cannot UPDATE/DELETE a
 *    webhook_config they do not own.
 *
 * Skips the admin-path tests when SUPABASE_SERVICE_ROLE_KEY is not set.
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
  const email = `wh-edge-${crypto.randomUUID()}@example.test`;
  const password = `Test!${crypto.randomUUID()}`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`signUp failed: ${error.message}`);
  return { client, userId: data.user!.id, email, password };
}

// ---------------------------------------------------------------------------
// Malformed input handling — should error, never silently succeed
// ---------------------------------------------------------------------------

test("malformed input: regenerate_webhook_secret rejects non-UUID config_id", async () => {
  const { client } = await signedUpClient();
  const { error } = await client.rpc("regenerate_webhook_secret", {
    // deliberately broken UUID
    _config_id: "not-a-uuid" as unknown as string,
  });
  assert(error, "expected an error for malformed UUID");
});

test("malformed input: verify_webhook_secret rejects non-UUID config_id", async () => {
  const { client } = await signedUpClient();
  const { error } = await client.rpc("verify_webhook_secret", {
    _config_id: "definitely-not-a-uuid" as unknown as string,
    _provided_secret: "anything",
  });
  assert(error, "expected an error for malformed UUID");
});

test("malformed input: verify_webhook_secret rejects null secret", async () => {
  const { client } = await signedUpClient();
  const { error } = await client.rpc("verify_webhook_secret", {
    _config_id: "00000000-0000-0000-0000-000000000000",
    _provided_secret: null as unknown as string,
  });
  // Either PostgREST rejects the null arg, or the admin gate rejects first.
  assert(error, "expected an error for null provided_secret");
});

// ---------------------------------------------------------------------------
// RLS on webhook_configs: cross-user mutation must be blocked
// ---------------------------------------------------------------------------

if (!SERVICE_ROLE_KEY) {
  test("RLS cross-user webhook_configs: SKIPPED (no SUPABASE_SERVICE_ROLE_KEY)", () => {
    console.warn("Skipping cross-user RLS tests — set SUPABASE_SERVICE_ROLE_KEY to run them.");
  });
} else {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  test("RLS: user cannot update another user's webhook_config", async () => {
    const owner = await signedUpClient();
    const intruder = await signedUpClient();

    const { data: cfg, error: cfgErr } = await admin
      .from("webhook_configs")
      .insert({
        user_id: owner.userId,
        secret_key: "owner_" + crypto.randomUUID().replace(/-/g, ""),
      })
      .select("id")
      .single();
    assertEquals(cfgErr, null);
    const cfgId = cfg!.id as string;

    try {
      // Sign in as intruder and try to update / delete owner's config.
      const { error: signInErr } = await intruder.client.auth.signInWithPassword({
        email: intruder.email,
        password: intruder.password,
      });
      assertEquals(signInErr, null);

      const { data: updated, error: updErr } = await intruder.client
        .from("webhook_configs")
        .update({ is_enabled: false })
        .eq("id", cfgId)
        .select("id");
      // RLS filters the row out: no error, but no rows affected.
      assertEquals(updErr, null);
      assertEquals(updated?.length ?? 0, 0);

      const { data: deleted, error: delErr } = await intruder.client
        .from("webhook_configs")
        .delete()
        .eq("id", cfgId)
        .select("id");
      assertEquals(delErr, null);
      assertEquals(deleted?.length ?? 0, 0);

      // Confirm the row is intact via service role.
      const { data: stillThere } = await admin
        .from("webhook_configs")
        .select("id, is_enabled")
        .eq("id", cfgId)
        .single();
      assertEquals(stillThere?.is_enabled, true);
    } finally {
      await admin.from("webhook_configs").delete().eq("id", cfgId);
    }
  });

  // -------------------------------------------------------------------------
  // Admin-gated functions: ownership and missing-secret edge cases
  // -------------------------------------------------------------------------

  async function makeAdmin(userId: string) {
    const { error } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    assertEquals(error, null);
  }

  test("admin: regenerate_webhook_secret fails on non-existent config", async () => {
    const { client, userId, email, password } = await signedUpClient();
    await makeAdmin(userId);
    try {
      const { error: signInErr } = await client.auth.signInWithPassword({
        email,
        password,
      });
      assertEquals(signInErr, null);

      const { error } = await client.rpc("regenerate_webhook_secret", {
        _config_id: crypto.randomUUID(), // valid UUID, but no such row
      });
      assert(error, "expected error when config does not exist");
      assert(
        /do not own|denied/i.test(error!.message),
        `unexpected message: ${error!.message}`,
      );
    } finally {
      await admin.from("user_roles").delete().eq("user_id", userId);
    }
  });

  test("admin: regenerate_webhook_secret fails on a config owned by someone else", async () => {
    const owner = await signedUpClient();
    const adminUser = await signedUpClient();
    await makeAdmin(adminUser.userId);

    const { data: cfg } = await admin
      .from("webhook_configs")
      .insert({
        user_id: owner.userId,
        secret_key: "owner_" + crypto.randomUUID().replace(/-/g, ""),
      })
      .select("id")
      .single();
    const cfgId = cfg!.id as string;

    try {
      const { error: signInErr } = await adminUser.client.auth.signInWithPassword({
        email: adminUser.email,
        password: adminUser.password,
      });
      assertEquals(signInErr, null);

      const { error } = await adminUser.client.rpc("regenerate_webhook_secret", {
        _config_id: cfgId,
      });
      assert(error, "expected ownership rejection");
      assert(
        /do not own|denied/i.test(error!.message),
        `unexpected message: ${error!.message}`,
      );
    } finally {
      await admin.from("webhook_configs").delete().eq("id", cfgId);
      await admin.from("user_roles").delete().eq("user_id", adminUser.userId);
    }
  });

  test("admin: verify_webhook_secret returns false for non-existent config or wrong secret", async () => {
    const { client, userId, email, password } = await signedUpClient();
    await makeAdmin(userId);

    const realSecret = "real_" + crypto.randomUUID().replace(/-/g, "");
    const { data: cfg } = await admin
      .from("webhook_configs")
      .insert({ user_id: userId, secret_key: realSecret })
      .select("id")
      .single();
    const cfgId = cfg!.id as string;

    try {
      const { error: signInErr } = await client.auth.signInWithPassword({
        email,
        password,
      });
      assertEquals(signInErr, null);

      // 1) Non-existent config id → false (not an exception)
      const { data: missData, error: missErr } = await client.rpc(
        "verify_webhook_secret",
        { _config_id: crypto.randomUUID(), _provided_secret: realSecret },
      );
      assertEquals(missErr, null);
      assertEquals(missData, false);

      // 2) Wrong secret on a real config → false
      const { data: wrongData, error: wrongErr } = await client.rpc(
        "verify_webhook_secret",
        { _config_id: cfgId, _provided_secret: "totally-wrong" },
      );
      assertEquals(wrongErr, null);
      assertEquals(wrongData, false);

      // 3) Empty-string secret → false (treated as "missing")
      const { data: emptyData, error: emptyErr } = await client.rpc(
        "verify_webhook_secret",
        { _config_id: cfgId, _provided_secret: "" },
      );
      assertEquals(emptyErr, null);
      assertEquals(emptyData, false);

      // 4) Correct secret → true
      const { data: okData, error: okErr } = await client.rpc(
        "verify_webhook_secret",
        { _config_id: cfgId, _provided_secret: realSecret },
      );
      assertEquals(okErr, null);
      assertEquals(okData, true);
    } finally {
      await admin.from("webhook_configs").delete().eq("id", cfgId);
      await admin.from("user_roles").delete().eq("user_id", userId);
    }
  });

  test("admin: verify_webhook_secret returns false for cross-user-owned config (admin doesn't own it)", async () => {
    const owner = await signedUpClient();
    const adminUser = await signedUpClient();
    await makeAdmin(adminUser.userId);

    const ownerSecret = "os_" + crypto.randomUUID().replace(/-/g, "");
    const { data: cfg } = await admin
      .from("webhook_configs")
      .insert({ user_id: owner.userId, secret_key: ownerSecret })
      .select("id")
      .single();
    const cfgId = cfg!.id as string;

    try {
      const { error: signInErr } = await adminUser.client.auth.signInWithPassword({
        email: adminUser.email,
        password: adminUser.password,
      });
      assertEquals(signInErr, null);

      // Even with the correct secret, the function scopes to user_id = auth.uid(),
      // so a different admin sees `false`.
      const { data, error } = await adminUser.client.rpc(
        "verify_webhook_secret",
        { _config_id: cfgId, _provided_secret: ownerSecret },
      );
      assertEquals(error, null);
      assertEquals(data, false);
    } finally {
      await admin.from("webhook_configs").delete().eq("id", cfgId);
      await admin.from("user_roles").delete().eq("user_id", adminUser.userId);
    }
  });
}