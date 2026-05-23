// Anthropic Claude gateway with logging + fallback to Lovable AI Gateway (Gemini)
// Used by mari-generate-document and similar legal-document edge functions.
import { logApiUsage, callLovableAI } from "./apiTrack.ts";

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

export interface CallAnthropicOpts {
  model?: string; // default claude-sonnet-4-6
  system?: string | ContentBlock[];
  messages: AnthropicMessage[];
  max_tokens?: number;
  temperature?: number;
  function_name: string;
  feature?: string;
  user_id?: string | null;
  metadata?: Record<string, any>;
  /**
   * If true (default), on Anthropic error/rate-limit, falls back to
   * Lovable Gateway with google/gemini-2.5-pro so the flow never blocks.
   */
  allow_fallback?: boolean;
  timeout_ms?: number; // abort request after this ms (default 90000)
  use_cache?: boolean; // enable prompt caching on system prompt (default true)
}

export interface CallAnthropicResult {
  text: string;
  provider: "anthropic" | "lovable_ai";
  model: string;
  fallback_used: boolean;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms: number;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export async function callAnthropic(
  opts: CallAnthropicOpts,
): Promise<CallAnthropicResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const model = opts.model ?? "claude-sonnet-4-6";
  const allowFallback = opts.allow_fallback !== false;
  const timeoutMs = opts.timeout_ms ?? 90000;
  const start = Date.now();

  if (!apiKey) {
    if (allowFallback) {
      console.warn("[anthropicGateway] ANTHROPIC_API_KEY missing — using Gemini fallback");
      return await fallbackToGemini(opts, "missing_anthropic_key", start);
    }
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const useCache = opts.use_cache !== false;

  // Prepare system prompt with optional caching
  let systemPayload: string | ContentBlock[] | undefined;
  if (opts.system) {
    if (useCache) {
      systemPayload = [
        {
          type: "text",
          text: String(opts.system),
          cache_control: { type: "ephemeral" },
        },
      ];
    } else {
      systemPayload = opts.system;
    }
  }

  try {
    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: opts.max_tokens ?? 4096,
        temperature: opts.temperature ?? 0.2,
        system: systemPayload,
        messages: opts.messages,
      }),
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      await logApiUsage({
        provider: "anthropic",
        model,
        function_name: opts.function_name,
        feature: opts.feature,
        user_id: opts.user_id,
        latency_ms: latency,
        status: resp.status === 429 ? "rate_limited" : "error",
        http_status: resp.status,
        error_message: errText.slice(0, 500),
        metadata: opts.metadata,
      });

      if (allowFallback && (resp.status === 429 || resp.status === 529 || resp.status >= 500)) {
        console.warn(`[anthropicGateway] ${resp.status} — falling back to Gemini`);
        return await fallbackToGemini(opts, `anthropic_${resp.status}`, start);
      }
      throw new Error(`Anthropic error ${resp.status}: ${errText.slice(0, 300)}`);
    }

    const data = await resp.json();
    const text = (data.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");
    const usage = data.usage ?? {};

    await logApiUsage({
      provider: "anthropic",
      model,
      function_name: opts.function_name,
      feature: opts.feature,
      user_id: opts.user_id,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      latency_ms: latency,
      status: "success",
      http_status: 200,
      metadata: opts.metadata,
    });

    return {
      text,
      provider: "anthropic",
      model,
      fallback_used: false,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      latency_ms: latency,
    };
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (allowFallback) {
      const msg = e?.message ?? String(e);
      if (msg.includes("abort")) {
        console.warn(`[anthropicGateway] timeout (${timeoutMs}ms) — falling back to Gemini`);
        return await fallbackToGemini(opts, `timeout_${timeoutMs}`, start);
      }
      console.warn(`[anthropicGateway] exception — fallback: ${msg}`);
      return await fallbackToGemini(opts, `exception:${msg.slice(0,80)}`, start);
    }
    throw e;
  }
}

async function fallbackToGemini(
  opts: CallAnthropicOpts,
  reason: string,
  start: number,
): Promise<CallAnthropicResult> {
  const fallbackModel = "google/gemini-2.5-pro";
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const resp = await callLovableAI(
    {
      model: fallbackModel,
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.max_tokens ?? 4096,
    },
    {
      function_name: opts.function_name,
      feature: opts.feature,
      user_id: opts.user_id,
      metadata: { ...opts.metadata, fallback_from: "anthropic", reason },
    },
  );

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Anthropic fallback to Gemini also failed: ${resp.status} ${t.slice(0, 200)}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  const usage = data?.usage ?? {};

  return {
    text,
    provider: "lovable_ai",
    model: fallbackModel,
    fallback_used: true,
    input_tokens: usage.prompt_tokens,
    output_tokens: usage.completion_tokens,
    latency_ms: Date.now() - start,
  };
}

/**
 * Render template body by replacing {{key}} placeholders.
 * Missing keys become "[NÃO INFORMADO]" to make gaps visible to the reviewer.
 */
export function hydrateTemplate(
  body: string,
  fields: Record<string, any>,
): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const v = fields?.[key];
    if (v === undefined || v === null || v === "") return "[NÃO INFORMADO]";
    return String(v);
  });
}
