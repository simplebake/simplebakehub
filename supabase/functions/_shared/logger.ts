/**
 * Lightweight structured logger with per-request correlation IDs.
 *
 * Usage:
 *   const log = createLogger("send-webhook", req);
 *   log.info("processing", { configId });
 *   log.warn("ssrf_blocked", { host });
 *   log.error("send_failed", { error: String(err) });
 *   return log.respond(payload, { status: 200 });
 *
 * - Reads or generates `x-correlation-id` (falls back to x-request-id).
 * - Emits one JSON line per log call to stdout, including fn, level, msg, ts,
 *   correlationId, and any extra fields.
 * - `respond()` echoes the correlation ID and CORS headers on the way out so
 *   clients (and downstream logs) can stitch traces together.
 */

const baseCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id, x-request-id",
  "Access-Control-Expose-Headers": "x-correlation-id",
};

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  correlationId: string;
  fn: string;
  child(extra: Record<string, unknown>): Logger;
  debug(msg: string, extra?: Record<string, unknown>): void;
  info(msg: string, extra?: Record<string, unknown>): void;
  warn(msg: string, extra?: Record<string, unknown>): void;
  error(msg: string, extra?: Record<string, unknown>): void;
  /** Build a Response with CORS + correlation headers attached. */
  respond(body: unknown, init?: ResponseInit & { headers?: Record<string, string> }): Response;
  /** CORS preflight response with correlation header. */
  preflight(): Response;
  corsHeaders: Record<string, string>;
}

function emit(
  level: LogLevel,
  fn: string,
  correlationId: string,
  msg: string,
  fields: Record<string, unknown> = {},
) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    fn,
    correlationId,
    msg,
    ...fields,
  };
  // One JSON line — Supabase log tooling and `grep` are both happy.
  const out = level === "error" || level === "warn" ? console.error : console.log;
  try {
    out(JSON.stringify(entry));
  } catch {
    out(`[${level}] ${fn} ${correlationId} ${msg}`);
  }
}

export function createLogger(fn: string, req?: Request, baseFields: Record<string, unknown> = {}): Logger {
  const incoming =
    req?.headers.get("x-correlation-id") ||
    req?.headers.get("x-request-id") ||
    "";
  const correlationId = incoming && incoming.length <= 128 ? incoming : crypto.randomUUID();

  const corsHeaders = { ...baseCorsHeaders, "x-correlation-id": correlationId };

  const make = (extra: Record<string, unknown>): Logger => {
    const fields = { ...baseFields, ...extra };
    return {
      correlationId,
      fn,
      corsHeaders,
      child: (more) => make({ ...fields, ...more }),
      debug: (msg, e) => emit("debug", fn, correlationId, msg, { ...fields, ...e }),
      info: (msg, e) => emit("info", fn, correlationId, msg, { ...fields, ...e }),
      warn: (msg, e) => emit("warn", fn, correlationId, msg, { ...fields, ...e }),
      error: (msg, e) => emit("error", fn, correlationId, msg, { ...fields, ...e }),
      preflight: () => new Response(null, { headers: corsHeaders }),
      respond: (body, init = {}) => {
        const headers = {
          "Content-Type": "application/json",
          ...corsHeaders,
          ...(init.headers ?? {}),
        };
        const payload = body === null || body === undefined ? "" : JSON.stringify(body);
        return new Response(payload, { ...init, headers });
      },
    };
  };

  return make({});
}
