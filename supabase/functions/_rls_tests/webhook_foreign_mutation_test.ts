/**
 * Verifies that non-admin webhook owners cannot mutate another user's
 * outgoing_url or secret_key — neither directly via UPDATE, nor indirectly
 * via the admin-gated `regenerate_webhook_secret` RPC.
 *
 * Threats covered:
 *  1. Direct UPDATE of foreign row's outgoing_url is silently filtered by RLS
 *     (no rows affected) and the stored value is unchanged.
 *  2. Direct UPDATE of foreign row's secret_key is silently filtered by RLS
 *     (no rows affected) and the stored value is unchanged.
 *  3. Even if a non-admin owns *some* config, attempting to set outgoing_url
 *     on their *own* row is rejected by `enforce_outgoing_url_admin_only`.
 *  4. `regenerate_webhook_secret` rejects non-admin callers entirely, so it
 *     cannot be used to rotate another user's secret_key.
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
  const email = `wh-fmut-${crypto.randomUUID()}@example.test`;
  const password = `Test!${crypto.randomUUID()}`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`signUp failed: ${error.message}`);
  return { client, userId: data.user!.id, email, password };
}

if (!SERVICE_ROLE_KEY) {
  test("foreign mutation guard: SKIPPED (no SUPABASE_SERVICE_ROLE_KEY)", () => {
    console.warn(
      "Skipping foreign-mutation tests — SUPABASE_SERVICE_ROLE_KEY is required to seed cross-user fixtures.",
    );
  });
} else {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  test(
    "non-admin owner cannot update or rotate another user's outgoing_url / secret_key",
    async () => {
      // Two users: victim (with sensitive config) and attacker (legit owner of own row).
      const victim = await signedUpClient();
      const attacker = await signedUpClient();

      const VICTIM_URL = `https://victim-${crypto.randomUUID().slice(0, 8)}.example.test/hook`;
      const VICTIM_SECRET = "vsec_" + crypto.randomUUID().replace(/-/g, "");

      // Seed victim's config via service role (bypasses admin-only outgoing_url trigger).
      const { data: victimCfg, error: vSeedErr } = await admin
        .from("webhook_configs")
        .insert({
          user_id: victim.userId,
          outgoing_url: VICTIM_URL,
          secret_key: VICTIM_SECRET,
          is_enabled: true,
        })
        .select("id, outgoing_url, secret_key")
        .single();
      assertEquals(vSeedErr, null);
      const victimConfigId = victimCfg!.id as string;

      // Attacker has their own (non-admin) row — no outgoing_url.
      const ATTACKER_SECRET = "asec_" + crypto.randomUUID().replace(/-/g, "");
      const { data: attackerCfg, error: aSeedErr } = await admin
        .from("webhook_configs")
        .insert({
          user_id: attacker.userId,
          outgoing_url: null,
          secret_key: ATTACKER_SECRET,
          is_enabled: true,
        })
        .select("id")
        .single();
      assertEquals(aSeedErr, null);
      const attackerConfigId = attackerCfg!.id as string;

      try {
        // Sign attacker in as a non-admin authenticated user.
        const { error: signInErr } = await attacker.client.auth.signInWithPassword({
          email: attacker.email,
          password: attacker.password,
        });
        assertEquals(signInErr, null);

        // --- 1. UPDATE foreign row's outgoing_url → RLS hides the row, 0 affected.
        const HIJACK_URL = "https://attacker.example.test/steal";
        const { data: urlUpdateRows, error: urlUpdateErr } = await attacker.client
          .from("webhook_configs")
          .update({ outgoing_url: HIJACK_URL })
          .eq("id", victimConfigId)
          .select("id");
        // Either RLS filters silently (empty array) or the trigger raises 42501.
        if (urlUpdateErr) {
          assert(
            /admin/i.test(urlUpdateErr.message) || urlUpdateErr.code === "42501",
            `unexpected error updating foreign outgoing_url: ${urlUpdateErr.message}`,
          );
        } else {
          assertEquals(
            urlUpdateRows?.length ?? 0,
            0,
            "RLS leak: attacker's UPDATE on victim's outgoing_url affected rows",
          );
        }

        // --- 2. UPDATE foreign row's secret_key → RLS hides the row, 0 affected.
        const { data: secUpdateRows, error: secUpdateErr } = await attacker.client
          .from("webhook_configs")
          .update({ secret_key: "hijacked_secret_value" })
          .eq("id", victimConfigId)
          .select("id");
        assertEquals(secUpdateErr, null);
        assertEquals(
          secUpdateRows?.length ?? 0,
          0,
          "RLS leak: attacker's UPDATE on victim's secret_key affected rows",
        );

        // Confirm victim's stored values are unchanged via service role.
        const { data: postVictim, error: postVictimErr } = await admin
          .from("webhook_configs")
          .select("outgoing_url, secret_key")
          .eq("id", victimConfigId)
          .single();
        assertEquals(postVictimErr, null);
        assertEquals(
          postVictim?.outgoing_url,
          VICTIM_URL,
          "victim's outgoing_url was mutated by a non-admin",
        );
        assertEquals(
          postVictim?.secret_key,
          VICTIM_SECRET,
          "victim's secret_key was mutated by a non-admin",
        );

        // --- 3. Attacker setting outgoing_url on their OWN row is admin-gated (42501).
        const { error: ownUrlErr } = await attacker.client
          .from("webhook_configs")
          .update({ outgoing_url: "https://my-own.example.test/hook" })
          .eq("id", attackerConfigId)
          .select("id");
        assert(ownUrlErr, "expected outgoing_url change on own row to be rejected");
        assert(
          /admin/i.test(ownUrlErr!.message) || ownUrlErr!.code === "42501",
          `unexpected error setting outgoing_url on own row: ${ownUrlErr!.message}`,
        );

        // --- 4. regenerate_webhook_secret rejects non-admin callers entirely.
        const { error: rotateForeignErr } = await attacker.client.rpc(
          "regenerate_webhook_secret",
          { _config_id: victimConfigId },
        );
        assert(rotateForeignErr, "expected RPC to reject non-admin");
        assert(
          /admin/i.test(rotateForeignErr!.message) ||
            /denied/i.test(rotateForeignErr!.message),
          `unexpected RPC error: ${rotateForeignErr!.message}`,
        );

        // Even targeting their own row, non-admin must be denied.
        const { error: rotateOwnErr } = await attacker.client.rpc(
          "regenerate_webhook_secret",
          { _config_id: attackerConfigId },
        );
        assert(rotateOwnErr, "expected RPC to reject non-admin even for own row");
        assert(
          /admin/i.test(rotateOwnErr!.message) ||
            /denied/i.test(rotateOwnErr!.message),
          `unexpected RPC error: ${rotateOwnErr!.message}`,
        );

        // Re-confirm victim's secret_key is still the seeded value after all attempts.
        const { data: finalVictim } = await admin
          .from("webhook_configs")
          .select("secret_key, outgoing_url")
          .eq("id", victimConfigId)
          .single();
        assertEquals(finalVictim?.secret_key, VICTIM_SECRET);
        assertEquals(finalVictim?.outgoing_url, VICTIM_URL);
      } finally {
        await admin.from("webhook_configs").delete().eq("id", victimConfigId);
        await admin.from("webhook_configs").delete().eq("id", attackerConfigId);
        await admin.from("user_roles").delete().eq("user_id", victim.userId);
        await admin.from("user_roles").delete().eq("user_id", attacker.userId);
      }
    },
  );
}