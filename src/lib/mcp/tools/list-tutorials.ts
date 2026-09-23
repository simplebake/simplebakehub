import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_tutorials",
  title: "List tutorials",
  description: "Search and list gluten-free baking tutorials by title or category.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).describe("Maximum number of tutorials to return."),
    search: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .describe("Match tutorial titles containing this text, or null for no filter."),
    category: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .describe("Only return tutorials in this category, or null for all categories."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search, category }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("tutorials")
      .select("id, title, category, content, tags, updated_at")
      .order("title", { ascending: true })
      .limit(limit);

    if (search) query = query.ilike("title", `%${search}%`);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const tutorials = (data ?? []).map((t) => ({
      id: t.id as string,
      title: t.title as string,
      category: t.category as string,
      content: t.content as string,
      tags: ((t.tags as string[] | null) ?? []).map((tag) => tag),
      updatedAt: t.updated_at as string,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(tutorials, null, 2) }],
      structuredContent: { tutorials },
    };
  },
});
