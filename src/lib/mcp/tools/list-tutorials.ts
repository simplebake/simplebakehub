import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_tutorials",
  title: "List tutorials",
  description: "Search and list published gluten-free baking tutorials.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).describe("Maximum number of tutorials to return."),
    search: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .describe("Match tutorial titles containing this text, or null for no filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("tutorials")
      .select("id, title, description, difficulty, category, duration_minutes")
      .order("title", { ascending: true })
      .limit(limit);

    if (search) query = query.ilike("title", `%${search}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const tutorials = (data ?? []).map((t) => ({
      id: t.id as string,
      title: t.title as string,
      description: (t.description as string | null) ?? null,
      difficulty: (t.difficulty as string | null) ?? null,
      category: (t.category as string | null) ?? null,
      durationMinutes: (t.duration_minutes as number | null) ?? null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(tutorials, null, 2) }],
      structuredContent: { tutorials },
    };
  },
});
