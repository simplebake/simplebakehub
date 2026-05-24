/**
 * Error-channel inference tests for webhook_configs.outgoing_url.
 *
 * A non-admin attacker must not be able to distinguish "victim's row exists
 * with this outgoing_url" from "no such row" by observing:
 *   1. Error message text / error code
 *   2. HTTP status code
 *   3. Response shape (data === [] / null) and `count`
 *   4. .single() / .maybeSingle() behaviour
 *   5. Mutation (update/delete) feedback when targeting a foreign row
 *
 * Every probe targeting the victim's real outgoing_url must produce the same
 * observable outcome as the same probe against a random non-existent URL.
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
  const email = `wh-err-${crypto.randomUUID()}@example.test`;
  const password = `Test!${crypto.randomUUID()}`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`signUp failed: ${error.message}`);
  return { client, userId: data.user!.id, email, password };
}

if (!SERVICE_ROLE_KEY) {
  test("outgoing_url error-channel: SKIPPED (no SUPABASE_SERVICE_ROLE_KEY)", () => {
    console.warn(
      "Skipping error-channel inference tests — SUPABASE_SERVICE_ROLE_KEY required.",
    );
  });
} else {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const VICTIM_HOST = `victim-${crypto.randomUUID().slice(0, 8)}.example.test`;
  const VICTIM_URL = `https://${VICTIM_HOST}/secret-path`;
  const NONEXISTENT_URL = `https://nonexistent-${crypto.randomUUID().slice(0, 8)}.example.test/none`;

  test(
    "outgoing_url queries fail gracefully with no leakage via errors/status/shape",
    async () => {
      const victim = await signedUpClient();
      const attacker = await signedUpClient();

      const { data: victimRow, error: seedErr } = await admin
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
      const victimId = victimRow!.id as string;

      // Normalise PostgREST error objects to a comparable signature. The
      // exact message must be identical between victim-probe and
      // nonexistent-probe — otherwise a difference is itself a side channel.
      const errSig = (e: unknown) => {
        if (!e || typeof e !== "object") return { present: !!e };
        const o = e as Record<string, unknown>;
        return {
          code: o.code ?? null,
          message: o.message ?? null,
          details: o.details ?? null,
          hint: o.hint ?? null,
        };
      };

      // Assert that the response from a victim-targeted probe is observably
      // identical to a probe against a guaranteed-nonexistent URL.
      const assertIndistinguishable = (
        label: string,
        victimResp: { data: unknown; error: unknown; count?: number | null; status?: number; statusText?: string },
        baselineResp: { data: unknown; error: unknown; count?: number | null; status?: number; statusText?: string },
      ) => {
        assertEquals(
          errSig(victimResp.error),
          errSig(baselineResp.error),
          `${label}: error signatures differ → leak channel`,
        );
        // Data must be empty in both cases (no row leak), and equal shape.
        const victimData = Array.isArray(victimResp.data)
          ? victimResp.data
          : victimResp.data == null
            ? null
            : victimResp.data;
        const baselineData = Array.isArray(baselineResp.data)
          ? baselineResp.data
          : baselineResp.data == null
            ? null
            : baselineResp.data;
        if (Array.isArray(victimData)) {
          assertEquals(victimData.length, 0, `${label}: victim data leaked rows`);
        } else {
          assertEquals(victimData, null, `${label}: victim data leaked a row`);
        }
        assertEquals(
          Array.isArray(victimData),
          Array.isArray(baselineData),
          `${label}: data shape differs`,
        );
        if (Array.isArray(baselineData)) {
          assertEquals(
            baselineData.length,
            0,
            `${label}: baseline unexpectedly returned rows`,
          );
        }
        if (victimResp.count !== undefined || baselineResp.count !== undefined) {
          assertEquals(
            victimResp.count ?? null,
            baselineResp.count ?? null,
            `${label}: count differs → leak channel`,
          );
        }
        if (victimResp.status !== undefined || baselineResp.status !== undefined) {
          assertEquals(
            victimResp.status,
            baselineResp.status,
            `${label}: HTTP status differs → leak channel`,
          );
        }
      };

      try {
        const { error: signInErr } = await attacker.client.auth.signInWithPassword({
          email: attacker.email,
          password: attacker.password,
        });
        assertEquals(signInErr, null);

        // 1. .eq() select — victim URL vs nonexistent URL.
        const eqVictim = await attacker.client
          .from("webhook_configs")
          .select("id, user_id, outgoing_url")
          .eq("outgoing_url", VICTIM_URL);
        const eqNone = await attacker.client
          .from("webhook_configs")
          .select("id, user_id, outgoing_url")
          .eq("outgoing_url", NONEXISTENT_URL);
        assertIndistinguishable("select .eq()", eqVictim, eqNone);

        // 2. .ilike() select.
        const ilikeVictim = await attacker.client
          .from("webhook_configs")
          .select("id, user_id, outgoing_url")
          .ilike("outgoing_url", `%${VICTIM_HOST}%`);
        const ilikeNone = await attacker.client
          .from("webhook_configs")
          .select("id, user_id, outgoing_url")
          .ilike("outgoing_url", `%nonexistent-${crypto.randomUUID().slice(0, 8)}%`);
        assertIndistinguishable("select .ilike()", ilikeVictim, ilikeNone);

        // 3. count: 'exact' head request — must report 0 for both probes.
        const countVictim = await attacker.client
          .from("webhook_configs")
          .select("id", { head: true, count: "exact" })
          .eq("outgoing_url", VICTIM_URL);
        const countNone = await attacker.client
          .from("webhook_configs")
          .select("id", { head: true, count: "exact" })
          .eq("outgoing_url", NONEXISTENT_URL);
        assertEquals(countVictim.error, null);
        assertEquals(countNone.error, null);
        assertEquals(
          countVictim.count ?? 0,
          countNone.count ?? 0,
          "count(head) differs between victim and nonexistent probe",
        );
        assertEquals(countVictim.count ?? 0, 0, "count(head) leaked victim row");

        // 4. .maybeSingle() — must return data: null with same error sig.
        const msVictim = await attacker.client
          .from("webhook_configs")
          .select("id, user_id, outgoing_url")
          .eq("outgoing_url", VICTIM_URL)
          .maybeSingle();
        const msNone = await attacker.client
          .from("webhook_configs")
          .select("id, user_id, outgoing_url")
          .eq("outgoing_url", NONEXISTENT_URL)
          .maybeSingle();
        assertIndistinguishable(".maybeSingle()", msVictim, msNone);

        // 5. .single() — must error identically (PGRST116 "no rows") in both.
        const sVictim = await attacker.client
          .from("webhook_configs")
          .select("id, user_id, outgoing_url")
          .eq("outgoing_url", VICTIM_URL)
          .single();
        const sNone = await attacker.client
          .from("webhook_configs")
          .select("id, user_id, outgoing_url")
          .eq("outgoing_url", NONEXISTENT_URL)
          .single();
        assertEquals(
          errSig(sVictim.error),
          errSig(sNone.error),
          ".single() error signatures differ → leak channel",
        );
        assert(
          sVictim.error !== null,
          ".single() unexpectedly succeeded against victim probe",
        );
        assertEquals(sVictim.data, null, ".single() leaked victim row data");

        // 6. UPDATE targeting victim row by id — must report 0 affected rows
        //    with the same response signature as updating a random uuid.
        const fakeId = crypto.randomUUID();
        const updVictim = await attacker.client
          .from("webhook_configs")
          .update({ is_enabled: false })
          .eq("id", victimId)
          .select("id");
        const updFake = await attacker.client
          .from("webhook_configs")
          .update({ is_enabled: false })
          .eq("id", fakeId)
          .select("id");
        assertIndistinguishable("update .eq(id)", updVictim, updFake);

        // 7. UPDATE targeting victim row by outgoing_url filter — same.
        const updVictimByUrl = await attacker.client
          .from("webhook_configs")
          .update({ is_enabled: false })
          .eq("outgoing_url", VICTIM_URL)
          .select("id");
        const updNoneByUrl = await attacker.client
          .from("webhook_configs")
          .update({ is_enabled: false })
          .eq("outgoing_url", NONEXISTENT_URL)
          .select("id");
        assertIndistinguishable("update .eq(outgoing_url)", updVictimByUrl, updNoneByUrl);

        // 8. DELETE targeting victim row — same observable response as a
        //    delete that matches nothing.
        const delVictim = await attacker.client
          .from("webhook_configs")
          .delete()
          .eq("id", victimId)
          .select("id");
        const delFake = await attacker.client
          .from("webhook_configs")
          .delete()
          .eq("id", fakeId)
          .select("id");
        assertIndistinguishable("delete .eq(id)", delVictim, delFake);

        // 9. Confirm via admin that the victim row is untouched (no
        //    is_enabled flip, not deleted) — i.e. mutations failed silently
        //    AND truly had no effect, not just no feedback.
        const { data: stillThere, error: verifyErr } = await admin
          .from("webhook_configs")
          .select("id, outgoing_url, is_enabled")
          .eq("id", victimId)
          .single();
        assertEquals(verifyErr, null);
        assertEquals(stillThere?.id, victimId, "victim row was deleted by attacker");
        assertEquals(
          stillThere?.outgoing_url,
          VICTIM_URL,
          "victim row outgoing_url was mutated by attacker",
        );
        assertEquals(
          stillThere?.is_enabled,
          true,
          "victim row is_enabled was mutated by attacker",
        );
      } finally {
        await admin.from("webhook_configs").delete().eq("id", victimId);
        await admin.from("user_roles").delete().eq("user_id", victim.userId);
        await admin.from("user_roles").delete().eq("user_id", attacker.userId);
      }
    },
  );
}