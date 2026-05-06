/**
 * Additional inference-resistance tests for webhook_configs.outgoing_url.
 *
 * Verifies that a non-admin owner cannot infer another user's outgoing_url
 * value or existence via:
 *   1. ORDER BY outgoing_url (sorting must not surface foreign rows or values)
 *   2. range/pagination (.range) over the table
 *   3. count: 'exact' with head=true (total table count)
 *   4. count: 'planned' / 'estimated' variants
 *   5. grouping-style queries via PostgREST `or` filters and prefix ranges
 *      (gte/lt) on outgoing_url
 *   6. distinct-like probing via `.in('outgoing_url', [...])`
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
  const email = `wh-infer-${crypto.randomUUID()}@example.test`;
  const password = `Test!${crypto.randomUUID()}`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`signUp failed: ${error.message}`);
  return { client, userId: data.user!.id, email, password };
}

if (!SERVICE_ROLE_KEY) {
  test("outgoing_url inference: SKIPPED (no SUPABASE_SERVICE_ROLE_KEY)", () => {
    console.warn(
      "Skipping outgoing_url inference tests — SUPABASE_SERVICE_ROLE_KEY is required.",
    );
  });
} else {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const VICTIM_HOST = `victim-${crypto.randomUUID().slice(0, 8)}.example.test`;
  const VICTIM_URL = `https://${VICTIM_HOST}/secret-path`;
  const VICTIM_PREFIX = `https://${VICTIM_HOST}`;

  test(
    "outgoing_url cannot be inferred via ordering/range/count/grouping",
    async () => {
      const victim = await signedUpClient();
      const attacker = await signedUpClient();

      // Seed two victim rows so any ordering/grouping leak is unambiguous.
      const { data: victimRows, error: seedErr } = await admin
        .from("webhook_configs")
        .insert([
          {
            user_id: victim.userId,
            outgoing_url: VICTIM_URL,
            secret_key: "seed_" + crypto.randomUUID().replace(/-/g, ""),
            is_enabled: true,
          },
          {
            user_id: victim.userId,
            outgoing_url: `${VICTIM_PREFIX}/alt`,
            secret_key: "seed_" + crypto.randomUUID().replace(/-/g, ""),
            is_enabled: true,
          },
        ])
        .select("id");
      assertEquals(seedErr, null);
      const victimIds = (victimRows ?? []).map((r) => r.id as string);

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

      const assertNoForeignRow = (
        rows: Array<{ user_id?: string | null; outgoing_url?: string | null }> | null | undefined,
        label: string,
      ) => {
        for (const row of rows ?? []) {
          if (row.user_id !== undefined) {
            assert(
              row.user_id === attacker.userId,
              `RLS leak (${label}): foreign row with user_id=${row.user_id} surfaced`,
            );
          }
          assert(
            !(typeof row.outgoing_url === "string" && row.outgoing_url.includes(VICTIM_HOST)),
            `RLS leak (${label}): victim's outgoing_url surfaced`,
          );
        }
      };

      try {
        const { error: signInErr } = await attacker.client.auth.signInWithPassword({
          email: attacker.email,
          password: attacker.password,
        });
        assertEquals(signInErr, null);

        // 1. ORDER BY outgoing_url (asc + desc, nullsFirst variations).
        for (const ascending of [true, false]) {
          for (const nullsFirst of [true, false]) {
            const { data, error } = await attacker.client
              .from("webhook_configs")
              .select("id, user_id, outgoing_url")
              .order("outgoing_url", { ascending, nullsFirst });
            assertEquals(
              error,
              null,
              `ORDER BY outgoing_url asc=${ascending} nullsFirst=${nullsFirst} errored`,
            );
            assertNoForeignRow(
              data,
              `order asc=${ascending} nullsFirst=${nullsFirst}`,
            );
          }
        }

        // 2. Range / pagination — wide window must not pull in foreign rows.
        const { data: rangeRows, error: rangeErr } = await attacker.client
          .from("webhook_configs")
          .select("id, user_id, outgoing_url")
          .order("outgoing_url", { ascending: true, nullsFirst: true })
          .range(0, 999);
        assertEquals(rangeErr, null);
        assertNoForeignRow(rangeRows, "range(0,999)");

        // 3. Total count: 'exact' must reflect only attacker-visible rows.
        const { count: exactCount, error: exactErr } = await attacker.client
          .from("webhook_configs")
          .select("id", { head: true, count: "exact" });
        assertEquals(exactErr, null);
        assertEquals(
          exactCount,
          1,
          `count(exact) leaked total — got ${exactCount}, expected 1 (attacker's own row)`,
        );

        // 4. Planned / estimated variants — must also not over-count.
        // (Estimated counts can be inaccurate by design, so we only assert
        // that the RPC succeeds and does not reveal data via the response body.)
        for (const mode of ["planned", "estimated"] as const) {
          const { data, error } = await attacker.client
            .from("webhook_configs")
            .select("id, user_id, outgoing_url", { count: mode })
            .ilike("outgoing_url", `%${VICTIM_HOST}%`);
          assertEquals(error, null, `count(${mode}) errored`);
          assertNoForeignRow(data, `count(${mode}) body`);
        }

        // 5a. Grouping-style probe via PostgREST `or` filter.
        const { data: orRows, error: orErr } = await attacker.client
          .from("webhook_configs")
          .select("id, user_id, outgoing_url")
          .or(
            `outgoing_url.ilike.%${VICTIM_HOST}%,outgoing_url.eq.${VICTIM_URL}`,
          );
        assertEquals(orErr, null);
        assertEquals(
          orRows?.length ?? 0,
          0,
          "RLS leak: `or` filter on outgoing_url exposed victim row",
        );

        // 5b. Prefix range probe (gte/lt) — classic "binary search" inference.
        const { data: prefixRows, error: prefixErr } = await attacker.client
          .from("webhook_configs")
          .select("id, user_id, outgoing_url")
          .gte("outgoing_url", VICTIM_PREFIX)
          .lt("outgoing_url", `${VICTIM_PREFIX}~`);
        assertEquals(prefixErr, null);
        assertEquals(
          prefixRows?.length ?? 0,
          0,
          "RLS leak: prefix range on outgoing_url exposed victim row",
        );

        // 6. Distinct-like probing via `.in('outgoing_url', [...])`.
        const { data: inRows, error: inErr } = await attacker.client
          .from("webhook_configs")
          .select("id, user_id, outgoing_url")
          .in("outgoing_url", [VICTIM_URL, `${VICTIM_PREFIX}/alt`]);
        assertEquals(inErr, null);
        assertEquals(
          inRows?.length ?? 0,
          0,
          "RLS leak: `.in()` probe exposed victim row",
        );

        // 6b. Count of `.in()` probe must also be zero.
        const { count: inCount, error: inCountErr } = await attacker.client
          .from("webhook_configs")
          .select("id", { head: true, count: "exact" })
          .in("outgoing_url", [VICTIM_URL, `${VICTIM_PREFIX}/alt`]);
        assertEquals(inCountErr, null);
        assertEquals(
          inCount ?? 0,
          0,
          "RLS leak: count(.in) inferred victim's outgoing_url existence",
        );
      } finally {
        for (const id of victimIds) {
          await admin.from("webhook_configs").delete().eq("id", id);
        }
        await admin.from("webhook_configs").delete().eq("id", attackerConfigId);
        await admin.from("user_roles").delete().eq("user_id", victim.userId);
        await admin.from("user_roles").delete().eq("user_id", attacker.userId);
      }
    },
  );
}