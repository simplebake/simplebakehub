/**
 * Inference-resistance tests for webhook_configs.outgoing_url and secret_key
 * via substring matchers, regex filters, and limit/offset pagination.
 *
 * A non-admin attacker must not be able to confirm or narrow a victim's
 * outgoing_url or secret_key by probing with:
 *   1. .like()  prefix / suffix / middle wildcards
 *   2. .ilike() prefix / suffix / middle wildcards
 *   3. POSIX regex via .filter('col', 'match', ...) and .filter('col', 'imatch', ...)
 *   4. .not('col', 'is', null) combined with substring probes
 *   5. .limit() / .range() pagination — sweeping every page must never
 *      surface a foreign row, even with descending order on the target col.
 *
 * Every victim-targeted probe must return zero rows.
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
  const email = `wh-substr-${crypto.randomUUID()}@example.test`;
  const password = `Test!${crypto.randomUUID()}`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`signUp failed: ${error.message}`);
  return { client, userId: data.user!.id, email, password };
}

if (!SERVICE_ROLE_KEY) {
  test("substring/regex/pagination inference: SKIPPED (no SUPABASE_SERVICE_ROLE_KEY)", () => {
    console.warn(
      "Skipping substring/regex/pagination tests — SUPABASE_SERVICE_ROLE_KEY required.",
    );
  });
} else {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const VICTIM_TAG = `vt${crypto.randomUUID().slice(0, 8)}`;
  const VICTIM_HOST = `${VICTIM_TAG}.example.test`;
  const VICTIM_URL = `https://${VICTIM_HOST}/secret/${VICTIM_TAG}-path`;
  const VICTIM_SECRET_TOKEN = `sk_${VICTIM_TAG}_${crypto.randomUUID().replace(/-/g, "")}`;

  test(
    "outgoing_url & secret_key cannot be inferred via like/ilike/regex/pagination",
    async () => {
      const victim = await signedUpClient();
      const attacker = await signedUpClient();

      // Seed several victim rows so pagination sweeps have something to find.
      const seedRows = [
        {
          user_id: victim.userId,
          outgoing_url: VICTIM_URL,
          secret_key: VICTIM_SECRET_TOKEN,
          is_enabled: true,
        },
        {
          user_id: victim.userId,
          outgoing_url: `https://${VICTIM_HOST}/alt`,
          secret_key: `${VICTIM_SECRET_TOKEN}_alt`,
          is_enabled: true,
        },
        {
          user_id: victim.userId,
          outgoing_url: `https://${VICTIM_HOST}/third`,
          secret_key: `${VICTIM_SECRET_TOKEN}_third`,
          is_enabled: false,
        },
      ];
      const { data: insertedVictim, error: seedErr } = await admin
        .from("webhook_configs")
        .insert(seedRows)
        .select("id");
      assertEquals(seedErr, null);
      const victimIds = (insertedVictim ?? []).map((r) => r.id as string);

      // Seed an attacker row so pagination has at least one visible record.
      const { data: attackerCfg, error: attackerSeedErr } = await admin
        .from("webhook_configs")
        .insert({
          user_id: attacker.userId,
          outgoing_url: null,
          secret_key: "attacker_" + crypto.randomUUID().replace(/-/g, ""),
          is_enabled: true,
        })
        .select("id")
        .single();
      assertEquals(attackerSeedErr, null);
      const attackerConfigId = attackerCfg!.id as string;

      type Row = {
        id?: string;
        user_id?: string | null;
        outgoing_url?: string | null;
        secret_key?: string | null;
      };

      const assertNoForeignRow = (
        rows: Row[] | null | undefined,
        label: string,
      ) => {
        for (const row of rows ?? []) {
          if (row.user_id !== undefined) {
            assert(
              row.user_id === attacker.userId,
              `RLS leak (${label}): foreign row surfaced (user_id=${row.user_id})`,
            );
          }
          assert(
            !(
              typeof row.outgoing_url === "string" &&
              row.outgoing_url.includes(VICTIM_HOST)
            ),
            `RLS leak (${label}): victim outgoing_url surfaced`,
          );
          assert(
            !(
              typeof row.secret_key === "string" &&
              row.secret_key.includes(VICTIM_SECRET_TOKEN)
            ),
            `RLS leak (${label}): victim secret_key surfaced`,
          );
        }
      };

      try {
        const { error: signInErr } = await attacker.client.auth.signInWithPassword({
          email: attacker.email,
          password: attacker.password,
        });
        assertEquals(signInErr, null);

        // ---- 1 & 2. LIKE / ILIKE prefix, suffix, middle wildcards ---------
        const substrColumns: Array<{ col: "outgoing_url" | "secret_key"; needle: string }> = [
          { col: "outgoing_url", needle: VICTIM_HOST },
          { col: "outgoing_url", needle: VICTIM_TAG },
          { col: "secret_key", needle: VICTIM_SECRET_TOKEN },
          { col: "secret_key", needle: VICTIM_TAG },
        ];
        const patternBuilders = [
          (n: string) => `${n}%`,      // prefix
          (n: string) => `%${n}`,      // suffix
          (n: string) => `%${n}%`,     // middle
          (n: string) => `%${n.slice(0, 4)}%`, // partial middle
        ];
        for (const { col, needle } of substrColumns) {
          for (const build of patternBuilders) {
            const pattern = build(needle);

            const likeResp = await attacker.client
              .from("webhook_configs")
              .select("id, user_id, outgoing_url, secret_key")
              .like(col, pattern);
            assertEquals(likeResp.error, null, `.like(${col}, ${pattern}) errored`);
            assertEquals(
              likeResp.data?.length ?? 0,
              0,
              `.like(${col}, ${pattern}) leaked rows`,
            );
            assertNoForeignRow(likeResp.data as Row[], `like ${col} ${pattern}`);

            const ilikeResp = await attacker.client
              .from("webhook_configs")
              .select("id, user_id, outgoing_url, secret_key")
              .ilike(col, pattern.toUpperCase());
            assertEquals(ilikeResp.error, null, `.ilike(${col}, ${pattern}) errored`);
            assertEquals(
              ilikeResp.data?.length ?? 0,
              0,
              `.ilike(${col}, ${pattern}) leaked rows`,
            );
            assertNoForeignRow(ilikeResp.data as Row[], `ilike ${col} ${pattern}`);
          }
        }

        // ---- 3. POSIX regex via PostgREST `match` / `imatch` --------------
        const regexProbes: Array<{ col: "outgoing_url" | "secret_key"; pattern: string }> = [
          { col: "outgoing_url", pattern: `^https://${VICTIM_TAG}` },
          { col: "outgoing_url", pattern: VICTIM_HOST.replace(/\./g, "\\.") },
          { col: "outgoing_url", pattern: `secret/${VICTIM_TAG}` },
          { col: "secret_key", pattern: `^${VICTIM_SECRET_TOKEN.slice(0, 8)}` },
          { col: "secret_key", pattern: `${VICTIM_TAG}.*alt$` },
        ];
        for (const { col, pattern } of regexProbes) {
          for (const op of ["match", "imatch"] as const) {
            const resp = await attacker.client
              .from("webhook_configs")
              .select("id, user_id, outgoing_url, secret_key")
              .filter(col, op, pattern);
            assertEquals(
              resp.error,
              null,
              `.filter(${col}, ${op}, ${pattern}) errored`,
            );
            assertEquals(
              resp.data?.length ?? 0,
              0,
              `.filter(${col}, ${op}, ${pattern}) leaked rows`,
            );
            assertNoForeignRow(resp.data as Row[], `${op} ${col} ${pattern}`);
          }
        }

        // ---- 4. .not(col, 'is', null) combined with substring probe -------
        for (const { col, needle } of substrColumns) {
          const resp = await attacker.client
            .from("webhook_configs")
            .select("id, user_id, outgoing_url, secret_key")
            .not(col, "is", null)
            .ilike(col, `%${needle}%`);
          assertEquals(resp.error, null, `.not+ilike(${col}, ${needle}) errored`);
          assertEquals(
            resp.data?.length ?? 0,
            0,
            `.not+ilike(${col}, ${needle}) leaked rows`,
          );
          assertNoForeignRow(resp.data as Row[], `not+ilike ${col} ${needle}`);
        }

        // ---- 5. limit() / range() pagination sweep ------------------------
        // Sweep every page with both ascending and descending order on each
        // target column. The attacker should only ever see their own row.
        const orderCols: Array<"outgoing_url" | "secret_key" | "created_at"> = [
          "outgoing_url",
          "secret_key",
          "created_at",
        ];
        const pageSize = 2;
        for (const orderCol of orderCols) {
          for (const ascending of [true, false]) {
            for (const nullsFirst of [true, false]) {
              const seen = new Set<string>();
              for (let page = 0; page < 10; page++) {
                const from = page * pageSize;
                const to = from + pageSize - 1;
                const { data, error } = await attacker.client
                  .from("webhook_configs")
                  .select("id, user_id, outgoing_url, secret_key")
                  .order(orderCol, { ascending, nullsFirst })
                  .range(from, to);
                assertEquals(
                  error,
                  null,
                  `pagination order=${orderCol} asc=${ascending} page=${page} errored`,
                );
                assertNoForeignRow(
                  data as Row[],
                  `pagination order=${orderCol} asc=${ascending} nf=${nullsFirst} page=${page}`,
                );
                for (const r of data ?? []) seen.add(r.id as string);
                if ((data?.length ?? 0) < pageSize) break;
              }
              // Must never have surfaced any victim id.
              for (const vid of victimIds) {
                assert(
                  !seen.has(vid),
                  `pagination order=${orderCol} asc=${ascending} nf=${nullsFirst} leaked victim id ${vid}`,
                );
              }
              // Should have seen the attacker's own row at least once.
              assert(
                seen.has(attackerConfigId),
                `pagination order=${orderCol} asc=${ascending} nf=${nullsFirst} missed attacker's own row`,
              );
            }
          }
        }

        // 5b. limit() alone (no range) — even with absurd limits the
        //     attacker must only see their own row.
        for (const lim of [1, 5, 100, 1000]) {
          const { data, error } = await attacker.client
            .from("webhook_configs")
            .select("id, user_id, outgoing_url, secret_key")
            .limit(lim);
          assertEquals(error, null, `.limit(${lim}) errored`);
          assertNoForeignRow(data as Row[], `limit ${lim}`);
          assertEquals(
            data?.length ?? 0,
            1,
            `.limit(${lim}) returned ${data?.length} rows, expected 1 (attacker's own)`,
          );
        }
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