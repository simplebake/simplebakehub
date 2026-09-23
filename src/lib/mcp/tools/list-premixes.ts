import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_premixes",
  title: "List premixes",
  description: "List the gluten-free baking premixes available in Simple Bake Hub.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).describe("Maximum number of premixes to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("premixes")
      .select("id, name, description, difficulty, water_amount, oil_amount")
      .order("name", { ascending: true })
      .limit(limit);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const premixes = (data ?? []).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      description: p.description as string,
      difficulty: p.difficulty as string,
      waterAmount: p.water_amount as number,
      oilAmount: p.oil_amount as string,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(premixes, null, 2) }],
      structuredContent: { premixes },
    };
  },
});
