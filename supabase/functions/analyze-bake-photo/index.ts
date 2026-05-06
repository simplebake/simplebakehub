import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { validateImageBase64 } from "../_shared/imageValidation.ts";
import { createLogger } from "../_shared/logger.ts";

serve(async (req) => {
  const log = createLogger("analyze-bake-photo", req);
  if (req.method === "OPTIONS") return log.preflight();

  try {
    const auth = await requireAuth(req);
    if ("response" in auth) {
      log.warn("auth_failed");
      return auth.response;
    }
    const reqLog = log.child({ userId: auth.userId });

    const { imageBase64 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const imgCheck = validateImageBase64(imageBase64);
    if (!imgCheck.ok) {
      reqLog.warn("image_rejected", { reason: imgCheck.error, status: imgCheck.status });
      return log.respond({ error: imgCheck.error }, { status: imgCheck.status });
    }
    reqLog.info("ai_request_dispatch", { sizeBytes: imageBase64.length });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
        "X-Correlation-Id": log.correlationId,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert gluten-free baker and food photography analyst. Always use British English spelling (e.g., colour, flavour, analyse). Temperatures in Celsius first with Fahrenheit in parentheses.

Analyse the uploaded bake photo and provide detailed feedback in exactly this format:

OVERALL SCORE: [1-10]/10
CRUST: [Assessment of crust colour, thickness, texture, and crispness]
CRUMB: [Assessment of crumb structure, air pockets, density, and moisture]
SHAPE: [Assessment of rise, shape uniformity, and overall form]
COLOUR: [Assessment of browning, evenness, and visual appeal]
TEXTURE CLUES: [What the visual texture suggests about the eating experience]
STRENGTHS: [2-3 things done well]
IMPROVEMENTS: [2-3 specific, actionable suggestions for next time]
VERDICT: [One enthusiastic sentence summarising the bake]`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Please analyse this bake photo and provide detailed feedback." },
              {
                type: "image_url",
                image_url: { url: imageBase64 }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        reqLog.warn("ai_rate_limited");
        return log.respond({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
      }
      if (response.status === 402) {
        reqLog.warn("ai_quota_exceeded");
        return log.respond({ error: "AI service quota exceeded." }, { status: 402 });
      }
      const errorText = await response.text();
      reqLog.error("ai_gateway_error", { status: response.status, body: errorText.slice(0, 500) });
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;
    reqLog.info("ai_response_ok");
    return log.respond({ analysis }, { status: 200 });
  } catch (error) {
    log.error("unhandled_exception", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return log.respond(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
