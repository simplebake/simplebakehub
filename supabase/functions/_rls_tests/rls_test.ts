/**
 * RLS policy tests.
 *
 * Verifies that the project's row-level-security rules enforce access
 * correctly for the `anon` and `authenticated` roles, including the
 * `has_role` and `has_permission` SECURITY DEFINER helpers used in
 * policy USING clauses.
 *
 * Run with: supabase--test_edge_functions ({ functions: ["_rls_tests"] }).
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

/** Fresh anonymous client (anon role). */
const anonClient = () =>
  createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

/** Fresh signed-up user client (authenticated role with default 'user'). */
async function signedUpClient() {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });
  const email = `rls-test-${crypto.randomUUID()}@example.test`;
  const password = `Test!${crypto.randomUUID()}`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`signUp failed: ${error.message}`);
  return { client, userId: data.user!.id, email };
}

// ---------------------------------------------------------------------------
// anon role: must be denied on every protected table
// ---------------------------------------------------------------------------

const ANON_DENIED_TABLES = [
  "audit_logs",
  "app_settings",
  "blocked_ips",
  "rate_limits",
  "role_permissions",
  "user_permissions",
  "performance_goals",
  "performance_goal_history",
  "campaigns",
  "content_ideas",
  "feeding_logs",
  "baking_sessions",
  "user_preferences",
  "user_achievements",
  "notifications",
  "notification_preferences",
  "push_subscriptions",
  "conversations",
  "messages",
  "webhook_configs",
  "webhook_logs",
] as const;

for (const table of ANON_DENIED_TABLES) {
  Deno.test(`anon cannot read ${table}`, async () => {
    const { data, error } = await anonClient().from(table).select("*").limit(1);
    // RLS returns an empty array (not an error) when no policy matches.
    assertEquals(error, null);
    assertEquals(data?.length ?? 0, 0, `anon unexpectedly read rows from ${table}`);
  });
}

// Public-readable tables: anon SHOULD be able to read.
Deno.test("anon can read premixes (public)", async () => {
  const { error } = await anonClient().from("premixes").select("id").limit(1);
  assertEquals(error, null);
});

Deno.test("anon can read tutorials (public)", async () => {
  const { error } = await anonClient().from("tutorials").select("id").limit(1);
  assertEquals(error, null);
});

// ---------------------------------------------------------------------------
// has_role / has_permission / get_my_role_permissions: callable rules
// ---------------------------------------------------------------------------

Deno.test("anon cannot execute has_role (revoked)", async () => {
  const { error } = await anonClient().rpc("has_role", {
    _user_id: "00000000-0000-0000-0000-000000000000",
    _role: "admin",
  });
  assert(error, "expected anon has_role call to error");
});

Deno.test("anon cannot execute has_permission (revoked)", async () => {
  const { error } = await anonClient().rpc("has_permission", {
    _user_id: "00000000-0000-0000-0000-000000000000",
    _permission: "can_manage_visibility",
  });
  assert(error, "expected anon has_permission call to error");
});

Deno.test("anon cannot execute get_my_role_permissions (revoked)", async () => {
  const { error } = await anonClient().rpc("get_my_role_permissions");
  assert(error, "expected anon get_my_role_permissions call to error");
});

// ---------------------------------------------------------------------------
// authenticated role (default 'user'): RLS scoping
// ---------------------------------------------------------------------------

Deno.test("authenticated user has_role('admin') returns false", async () => {
  const { client, userId } = await signedUpClient();
  const { data, error } = await client.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  assertEquals(error, null);
  assertEquals(data, false);
});

Deno.test("authenticated user has_role('user') returns true (default role)", async () => {
  const { client, userId } = await signedUpClient();
  const { data, error } = await client.rpc("has_role", {
    _user_id: userId,
    _role: "user",
  });
  assertEquals(error, null);
  assertEquals(data, true);
});

Deno.test("authenticated user cannot read audit_logs (admin-only)", async () => {
  const { client } = await signedUpClient();
  const { data, error } = await client.from("audit_logs").select("*").limit(1);
  assertEquals(error, null);
  assertEquals(data?.length ?? 0, 0);
});

Deno.test("authenticated user cannot read blocked_ips (admin-only)", async () => {
  const { client } = await signedUpClient();
  const { data, error } = await client.from("blocked_ips").select("*").limit(1);
  assertEquals(error, null);
  assertEquals(data?.length ?? 0, 0);
});

Deno.test("authenticated user cannot read other users' webhook_configs", async () => {
  const { client } = await signedUpClient();
  const { data, error } = await client.from("webhook_configs").select("id").limit(5);
  assertEquals(error, null);
  // user just signed up — they own zero webhook configs and cannot see others
  assertEquals(data?.length ?? 0, 0);
});

Deno.test("authenticated user can read their own profile", async () => {
  const { client, userId } = await signedUpClient();
  // Wait briefly for handle_new_user trigger to create the row.
  await new Promise((r) => setTimeout(r, 500));
  const { data, error } = await client
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  assertEquals(error, null);
  assertEquals(data?.id, userId);
});

Deno.test("authenticated user cannot regenerate webhook secret (admin-only)", async () => {
  const { client } = await signedUpClient();
  const { error } = await client.rpc("regenerate_webhook_secret", {
    _config_id: "00000000-0000-0000-0000-000000000000",
  });
  assert(error, "expected non-admin call to be denied");
  assert(
    /admin/i.test(error!.message) || /denied/i.test(error!.message),
    `unexpected error message: ${error!.message}`,
  );
});

Deno.test("authenticated user has no admin permissions via get_my_role_permissions", async () => {
  const { client } = await signedUpClient();
  const { data, error } = await client.rpc("get_my_role_permissions");
  assertEquals(error, null);
  const perms = (data ?? []).map((r: { permission: string }) => r.permission);
  // Default 'user' role should not have any admin-tier permission.
  assert(
    !perms.includes("can_manage_visibility"),
    "default user unexpectedly has can_manage_visibility",
  );
});