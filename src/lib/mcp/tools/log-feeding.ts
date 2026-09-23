import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "log_feeding",
  title: "Log a starter feeding",
  description: "Record a sourdough starter feeding for the signed-in baker.",
  inputSchema: {
    starterName: z.string().trim().min(1).max(100).describe("Name of the starter being fed."),
    flourType: z.string().trim().min(1).max(100).describe("Flour used for the feeding."),
    flourAmountG: z.number().min(0).max(10000).describe("Flour amount in grams."),
    waterAmountG: z.number().min(0).max(10000).describe("Water amount in grams."),
    temperatureCelsius: z
      .number()
      .min(-20)
      .max(80)
      .nullable()
      .describe("Ambient temperature in Celsius, or null if unknown."),
    notes: z.string().trim().max(1000).nullable().describe("Optional notes, or null."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (
    { starterName, flourType, flourAmountG, waterAmountG, temperatureCelsius, notes },
    ctx,
  ) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("feeding_logs")
      .insert({
        user_id: ctx.getUserId(),
        starter_name: starterName,
        flour_type: flourType,
        flour_amount_g: flourAmountG,
        water_amount_g: waterAmountG,
        temperature_celsius: temperatureCelsius,
        notes,
      })
      .select("id, starter_name, fed_at")
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const feeding = data
      ? { id: data.id as string, starterName: data.starter_name as string, fedAt: data.fed_at as string }
      : null;

    return {
      content: [
        {
          type: "text",
          text: feeding
            ? `Logged a feeding for ${feeding.starterName} at ${feeding.fedAt}.`
            : "Feeding logged.",
        },
      ],
      structuredContent: { feeding },
    };
  },
});
