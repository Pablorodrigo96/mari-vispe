// MARI Ops — wrapper universal de observabilidade
// Todo edge function novo deve nascer com isso.
//
// Uso:
//   import { withObservability } from "../_shared/observability.ts";
//   serve(withObservability(async (req) => { ... }, { name: "minha-funcao" }));

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export interface ObservabilityOpts {
  name: string;
  // Se true, captura corpo da resposta como payload_summary (cuidado com PII)
  capturePayload?: boolean;
}

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

const _client = SERVICE_KEY && SUPABASE_URL
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

async function recordHealth(args: {
  name: string;
  status: "ok" | "error" | "warning";
  duration_ms: number;
  error_text?: string | null;
  payload_summary?: unknown;
  request_id?: string | null;
}) {
  if (!_client) return;
  try {
    await _client.schema("mari_ops").from("health_check").insert({
      function_name: args.name,
      status: args.status,
      duration_ms: args.duration_ms,
      error_text: args.error_text ?? null,
      payload_summary: args.payload_summary ?? null,
      request_id: args.request_id ?? null,
      source: "edge_function",
    });
  } catch (err) {
    // Não derrubar a função real se o log falhar
    console.error("[observability] failed to record:", err);
  }
}

export function withObservability(
  handler: (req: Request) => Promise<Response> | Response,
  opts: ObservabilityOpts,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const start = performance.now();
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

    // OPTIONS / preflight não conta como execução de negócio
    if (req.method === "OPTIONS") {
      return await handler(req);
    }

    try {
      const resp = await handler(req);
      const duration_ms = Math.round(performance.now() - start);
      const isError = resp.status >= 500;
      // Fire and forget
      recordHealth({
        name: opts.name,
        status: isError ? "error" : (resp.status >= 400 ? "warning" : "ok"),
        duration_ms,
        error_text: isError ? `HTTP ${resp.status}` : null,
        payload_summary: opts.capturePayload
          ? { status: resp.status }
          : { status: resp.status },
        request_id: requestId,
      }).catch(() => {});
      return resp;
    } catch (err) {
      const duration_ms = Math.round(performance.now() - start);
      const message = err instanceof Error ? err.message : String(err);
      recordHealth({
        name: opts.name,
        status: "error",
        duration_ms,
        error_text: message.slice(0, 1000),
        request_id: requestId,
      }).catch(() => {});
      throw err;
    }
  };
}
