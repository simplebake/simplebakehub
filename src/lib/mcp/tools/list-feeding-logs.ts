import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_feeding_logs",
  title: "List starter feedings",
  description: "List the signed-in baker's most recent sourdough starter feedings.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).describe("Maximum number of feedings to return."),
    starterName: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .describe("Only return feedings for this starter name, or null for all starters."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, starterName }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("feeding_logs")
      .select(
        "id, starter_name, fed_at, flour_type, flour_amount_g, water_amount_g, temperature_celsius, rise_percentage, peak_hours, notes",
      )
      .order("fed_at", { ascending: false })
      .limit(limit);

    if (starterName) query = query.eq("starter_name", starterName);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const feedings = (data ?? []).map((f) => ({
      id: f.id as string,
      starterName: f.starter_name as string,
      fedAt: f.fed_at as string,
      flourType: f.flour_type as string,
      flourAmountG: f.flour_amount_g as number,
      waterAmountG: f.water_amount_g as number,
      temperatureCelsius: (f.temperature_celsius as number | null) ?? null,
      risePercentage: (f.rise_percentage as number | null) ?? null,
      peakHours: (f.peak_hours as number | null) ?? null,
      notes: (f.notes as string | null) ?? null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(feedings, null, 2) }],
      structuredContent: { feedings },
    };
  },
});
