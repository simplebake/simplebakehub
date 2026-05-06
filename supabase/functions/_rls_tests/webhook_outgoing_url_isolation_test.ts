/**
 * Verifies that non-admin webhook owners cannot read or infer another user's
 * `outgoing_url` value via the public webhook_configs table.
 *
 * Threats covered:
 *  1. Direct SELECT — RLS must filter foreign rows out entirely.
 *  2. Targeted SELECT by id — must return no row even with a known id.
 *  3. Filter-based inference — `.ilike('outgoing_url', '%hooks.example%')`
 *     and `.not('outgoing_url', 'is', null)` must not leak existence/values.
 *  4. COUNT inference — `head: true, count: 'exact'` filtered on outgoing_url
 *     must not reveal whether other rows match.
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
  const email = `wh-isolation-${crypto.randomUUID()}@example.test`;
  const password = `Test!${crypto.randomUUID()}`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`signUp failed: ${error.message}`);
  return { client, userId: data.user!.id, email, password };
}

if (!SERVICE_ROLE_KEY) {
  test("outgoing_url isolation: SKIPPED (no SUPABASE_SERVICE_ROLE_KEY)", () => {
    console.warn(
      "Skipping outgoing_url isolation tests — SUPABASE_SERVICE_ROLE_KEY is required to seed cross-user fixtures.",
    );
  });
} else {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Distinctive marker so we can detect any leak unambiguously.
  const VICTIM_HOST = `victim-${crypto.randomUUID().slice(0, 8)}.example.test`;
  const VICTIM_URL = `https://${VICTIM_HOST}/secret-webhook-path`;

  test(
    "non-admin owner cannot read or infer another user's outgoing_url",
    async () => {
      // --- Set up two users: a "victim" (with an outgoing_url) and an "attacker".
      const victim = await signedUpClient();
      const attacker = await signedUpClient();

      // Seed victim's webhook_config via service role (bypasses the
      // admin-only outgoing_url trigger, simulating an existing admin-created row).
      const { data: victimCfg, error: seedErr } = await admin
        .from("webhook_configs")
        .insert({
          user_id: victim.userId,
          outgoing_url: VICTIM_URL,
          secret_key: "seed_" + crypto.randomUUID().replace(/-/g, ""),
          is_enabled: true,
        })
        .select("id")
        .single();
      assertEquals(seedErr, null);
      const victimConfigId = victimCfg!.id as string;

      // Also give the attacker a config of their own (no outgoing_url) so they
      // are a legitimate non-admin owner — RLS must still hide the victim's row.
      const { data: attackerCfg, error: attackerSeedErr } = await admin
        .from("webhook_configs")
        .insert({
          user_id: attacker.userId,
          outgoing_url: null,
          secret_key: "seed_" + crypto.randomUUID().replace(/-/g, ""),
          is_enabled: true,
        })
        .select("id")
        .single();
      assertEquals(attackerSeedErr, null);
      const attackerConfigId = attackerCfg!.id as string;

      try {
        // Sign attacker in as a regular (non-admin) authenticated user.
        const { error: signInErr } = await attacker.client.auth.signInWithPassword({
          email: attacker.email,
          password: attacker.password,
        });
        assertEquals(signInErr, null);

        // --- 1. Direct broad SELECT must not return the victim row.
        const { data: allRows, error: allErr } = await attacker.client
          .from("webhook_configs")
          .select("id, user_id, outgoing_url");
        assertEquals(allErr, null);
        assert(Array.isArray(allRows));
        for (const row of allRows!) {
          assert(
            row.user_id === attacker.userId,
            `RLS leak: attacker received row owned by ${row.user_id}`,
          );
          assert(
            !(typeof row.outgoing_url === "string" && row.outgoing_url.includes(VICTIM_HOST)),
            "RLS leak: victim's outgoing_url surfaced in broad SELECT",
          );
        }

        // --- 2. Targeted SELECT by the victim's known config id returns nothing.
        const { data: targeted, error: targetedErr } = await attacker.client
          .from("webhook_configs")
          .select("id, outgoing_url")
          .eq("id", victimConfigId);
        assertEquals(targetedErr, null);
        assertEquals(
          targeted?.length ?? 0,
          0,
          "RLS leak: targeted SELECT exposed victim row",
        );

        // --- 3a. Filter-based inference via ILIKE on outgoing_url.
        const { data: ilikeRows, error: ilikeErr } = await attacker.client
          .from("webhook_configs")
          .select("id, outgoing_url")
          .ilike("outgoing_url", `%${VICTIM_HOST}%`);
        assertEquals(ilikeErr, null);
        assertEquals(
          ilikeRows?.length ?? 0,
          0,
          "RLS leak: ILIKE filter exposed existence of victim's outgoing_url",
        );

        // --- 3b. Filter-based inference via "outgoing_url is not null".
        const { data: notNullRows, error: notNullErr } = await attacker.client
          .from("webhook_configs")
          .select("id, user_id")
          .not("outgoing_url", "is", null);
        assertEquals(notNullErr, null);
        for (const row of notNullRows ?? []) {
          assert(
            row.user_id === attacker.userId,
            "RLS leak: not-null filter returned a foreign-owned row",
          );
        }

        // --- 4. COUNT-based inference must not reveal foreign matches.
        const { count, error: countErr } = await attacker.client
          .from("webhook_configs")
          .select("id", { head: true, count: "exact" })
          .ilike("outgoing_url", `%${VICTIM_HOST}%`);
        assertEquals(countErr, null);
        assertEquals(
          count ?? 0,
          0,
          "RLS leak: count() inferred existence of victim's outgoing_url",
        );
      } finally {
        await admin.from("webhook_configs").delete().eq("id", victimConfigId);
        await admin.from("webhook_configs").delete().eq("id", attackerConfigId);
        await admin.from("user_roles").delete().eq("user_id", victim.userId);
        await admin.from("user_roles").delete().eq("user_id", attacker.userId);
      }
    },
  );
}