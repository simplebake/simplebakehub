import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_baking_sessions",
  title: "List baking sessions",
  description: "List the signed-in baker's recent bakes, with outcome ratings and conditions.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).describe("Maximum number of bakes to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("baking_sessions")
      .select(
        "id, premix_id, created_at, completed_at, success_rating, issues, outcome_notes, temperature_celsius, humidity_percent, oven_type",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const sessions = (data ?? []).map((s) => ({
      id: s.id as string,
      premixId: s.premix_id as string,
      createdAt: s.created_at as string,
      completedAt: (s.completed_at as string | null) ?? null,
      successRating: (s.success_rating as number | null) ?? null,
      issues: ((s.issues as string[] | null) ?? []).map((issue) => issue),
      outcomeNotes: (s.outcome_notes as string | null) ?? null,
      temperatureCelsius: (s.temperature_celsius as number | null) ?? null,
      humidityPercent: (s.humidity_percent as number | null) ?? null,
      ovenType: (s.oven_type as string | null) ?? null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(sessions, null, 2) }],
      structuredContent: { sessions },
    };
  },
});
