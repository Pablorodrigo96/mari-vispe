// Shared instrumentation helpers for tracking AI/API usage.
// Logs to public.api_usage_logs (fire-and-forget, never blocks the caller).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

let _adminCache: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (_adminCache) return _adminCache;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("apiTrack: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set");
  }
  _adminCache = createClient(url, key, { auth: { persistSession: false } });
  return _adminCache;
}

// In-process pricing cache (refreshes every 5 min)
let pricingCache: Map<string, any> | null = null;
let pricingCacheAt = 0;
let usdBrlRate = 5.2;
let settingsAt = 0;

async function getPricing(provider: string, model: string | null) {
  const now = Date.now();
  if (!pricingCache || now - pricingCacheAt > 5 * 60_000) {
    const { data } = await getAdmin().from("api_pricing").select("*");
    pricingCache = new Map();
    (data ?? []).forEach((p: any) => {
      pricingCache!.set(`${p.provider}::${p.model}`, p);
    });
    pricingCacheAt = now;
  }
  return (
    pricingCache.get(`${provider}::${model ?? "default"}`) ??
    pricingCache.get(`${provider}::default`) ??
    null
  );
}

async function getUsdBrl(): Promise<number> {
  const now = Date.now();
  if (now - settingsAt < 5 * 60_000) return usdBrlRate;
  const { data } = await getAdmin()
    .from("api_settings")
    .select("value")
    .eq("key", "usd_brl_rate")
    .maybeSingle();
  const v = (data as any)?.value;
  if (v) usdBrlRate = parseFloat(String(v)) || 5.2;
  settingsAt = now;
  return usdBrlRate;
}

// ===== Pure helpers (exported for unit tests) =====

export interface PricingRow {
  input_per_1m_usd?: number | string | null;
  output_per_1m_usd?: number | string | null;
  flat_per_call_usd?: number | string | null;
}

/** Compute USD cost for a call given pricing + token counts. Null pricing => 0. */
export function computeCostUsd(
  pricing: PricingRow | null | undefined,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
  requestCount: number = 1,
): number {
  if (!pricing) return 0;
  const inTok = inputTokens ?? 0;
  const outTok = outputTokens ?? 0;
  const calls = requestCount ?? 1;
  return (
    (inTok / 1_000_000) * Number(pricing.input_per_1m_usd ?? 0) +
    (outTok / 1_000_000) * Number(pricing.output_per_1m_usd ?? 0) +
    calls * Number(pricing.flat_per_call_usd ?? 0)
  );
}

/** Resolve total tokens with the same logic used in logApiUsage. Returns null when zero/missing. */
export function resolveTotalTokens(
  total: number | null | undefined,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
): number | null {
  const inTok = inputTokens ?? 0;
  const outTok = outputTokens ?? 0;
  return ((total ?? (inTok + outTok)) || null) as number | null;
}

/** Detect provider/category from URL. */
export function detectProvider(url: string): { provider: string; category: string } {
  const provider = url.includes("anthropic.com")
    ? "anthropic"
    : url.includes("perplexity.ai")
    ? "perplexity"
    : url.includes("ai.gateway.lovable.dev")
    ? "lovable_ai"
    : "unknown";
  const category = url.includes("/embeddings") ? "embedding" : "llm";
  return { provider, category };
}

/** Normalize OpenAI/Anthropic/Perplexity usage payloads into {input,output,total}. */
export function extractUsage(usage: any): {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
} {
  const u = usage ?? {};
  const inTok = u.prompt_tokens ?? u.input_tokens ?? null;
  const outTok = u.completion_tokens ?? u.output_tokens ?? null;
  const total = u.total_tokens ?? null;
  return {
    input_tokens: inTok,
    output_tokens: outTok,
    total_tokens: resolveTotalTokens(total, inTok, outTok),
  };
}

// ===== Provider guard (kill switch + monthly budget) =====

export class ProviderDisabledError extends Error {
  status = 503;
  constructor(public provider: string) {
    super(`Provider ${provider} is disabled by admin kill switch`);
    this.name = "ProviderDisabledError";
  }
}

export class ProviderBudgetExceededError extends Error {
  status = 402;
  constructor(public provider: string, public spentUsd: number, public budgetUsd: number) {
    super(
      `Provider ${provider} exceeded monthly budget: $${spentUsd.toFixed(4)} >= $${budgetUsd.toFixed(2)}`,
    );
    this.name = "ProviderBudgetExceededError";
  }
}

// settings cache (5min)
const settingsCache = new Map<string, { value: string; at: number }>();
async function getSetting(key: string): Promise<string | null> {
  const cached = settingsCache.get(key);
  const now = Date.now();
  if (cached && now - cached.at < 5 * 60_000) return cached.value;
  const { data } = await getAdmin()
    .from("api_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const value = (data as any)?.value ?? null;
  if (value != null) settingsCache.set(key, { value, at: now });
  return value;
}

// MTD cost cache (60s, per provider)
const mtdCache = new Map<string, { cost: number; at: number }>();
async function getMonthToDateCostUsd(provider: string): Promise<number> {
  const cached = mtdCache.get(provider);
  const now = Date.now();
  if (cached && now - cached.at < 60_000) return cached.cost;
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const { data } = await getAdmin()
    .from("api_usage_logs")
    .select("cost_usd")
    .eq("provider", provider)
    .gte("created_at", startOfMonth.toISOString());
  const cost = (data ?? []).reduce(
    (s: number, r: any) => s + Number(r.cost_usd ?? 0),
    0,
  );
  mtdCache.set(provider, { cost, at: now });
  return cost;
}

/**
 * Guard a provider call: throws if killed or over budget. Logs warning at threshold.
 * Call this BEFORE making the outbound fetch.
 */
export async function assertProviderAllowed(provider: string): Promise<void> {
  // 1) kill switch
  const enabled = await getSetting(`${provider}_enabled`);
  if (enabled === "false") throw new ProviderDisabledError(provider);

  // 2) budget
  const budgetStr = await getSetting(`${provider}_monthly_budget_usd`);
  if (!budgetStr) return;
  const budget = Number(budgetStr);
  if (!Number.isFinite(budget) || budget <= 0) return;

  const spent = await getMonthToDateCostUsd(provider);
  if (spent >= budget) {
    throw new ProviderBudgetExceededError(provider, spent, budget);
  }

  // 3) threshold warning
  const thrStr = await getSetting(`${provider}_alert_threshold_pct`);
  const thr = Number(thrStr ?? 0.8);
  if (Number.isFinite(thr) && thr > 0 && spent >= thr * budget) {
    console.warn(
      `[apiTrack] ${provider} reached ${((spent / budget) * 100).toFixed(1)}% of monthly budget ($${spent.toFixed(4)} / $${budget.toFixed(2)})`,
    );
  }
}

interface LogParams {
  provider: string;
  category?: string;
  model?: string | null;
  function_name?: string;
  feature?: string;
  user_id?: string | null;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  request_count?: number;
  latency_ms?: number;
  status?: "success" | "error" | "rate_limited";
  http_status?: number;
  error_message?: string;
  metadata?: Record<string, any>;
}

export async function logApiUsage(p: LogParams) {
  try {
    const pricing = await getPricing(p.provider, p.model ?? null);
    const rate = await getUsdBrl();
    const inTok = p.input_tokens ?? 0;
    const outTok = p.output_tokens ?? 0;
    const calls = p.request_count ?? 1;
    const cost_usd = computeCostUsd(pricing, inTok, outTok, calls);
    const cost_brl = cost_usd * rate;

    // fire-and-forget
    void getAdmin()
      .from("api_usage_logs")
      .insert({
        provider: p.provider,
        category: p.category ?? "llm",
        model: p.model ?? null,
        function_name: p.function_name ?? null,
        feature: p.feature ?? null,
        user_id: p.user_id ?? null,
        input_tokens: inTok || null,
        output_tokens: outTok || null,
        total_tokens: resolveTotalTokens(p.total_tokens, inTok, outTok),
        request_count: calls,
        cost_usd,
        cost_brl,
        latency_ms: p.latency_ms ?? null,
        status: p.status ?? "success",
        http_status: p.http_status ?? null,
        error_message: p.error_message ?? null,
        metadata: p.metadata ?? null,
      })
      .then(({ error }) => {
        if (error) console.error("[apiTrack] insert failed:", error.message);
      });
  } catch (e) {
    console.error("[apiTrack] log error:", e);
  }
}

// ===== High-level wrappers =====

interface CallOpts {
  function_name: string;
  feature?: string;
  user_id?: string | null;
  metadata?: Record<string, any>;
}

export async function callLovableAI(
  body: Record<string, any>,
  opts: CallOpts,
): Promise<Response> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  const start = Date.now();
  const isStream = body.stream === true;
  const resp = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const latency = Date.now() - start;

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    await logApiUsage({
      provider: "lovable_ai",
      category: "llm",
      model: body.model ?? "google/gemini-2.5-flash",
      function_name: opts.function_name,
      feature: opts.feature,
      user_id: opts.user_id,
      latency_ms: latency,
      status: resp.status === 429 ? "rate_limited" : "error",
      http_status: resp.status,
      error_message: text.slice(0, 500),
      metadata: opts.metadata,
    });
    return new Response(text, { status: resp.status, headers: resp.headers });
  }

  if (isStream) {
    // Cannot read tokens from stream without consuming it;
    // estimate roughly via metadata if caller passes it later.
    await logApiUsage({
      provider: "lovable_ai",
      category: "llm",
      model: body.model ?? "google/gemini-2.5-flash",
      function_name: opts.function_name,
      feature: opts.feature,
      user_id: opts.user_id,
      latency_ms: latency,
      status: "success",
      http_status: resp.status,
      metadata: { ...opts.metadata, stream: true },
    });
    return resp;
  }

  const data = await resp.json();
  const usage = data.usage ?? {};
  await logApiUsage({
    provider: "lovable_ai",
    category: "llm",
    model: body.model ?? "google/gemini-2.5-flash",
    function_name: opts.function_name,
    feature: opts.feature,
    user_id: opts.user_id,
    input_tokens: usage.prompt_tokens,
    output_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
    latency_ms: latency,
    status: "success",
    http_status: resp.status,
    metadata: opts.metadata,
  });
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function callAnthropic(
  body: Record<string, any>,
  opts: CallOpts,
): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");
  const start = Date.now();
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const latency = Date.now() - start;
  const text = await resp.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch (_) {
    /* keep raw */
  }

  if (!resp.ok) {
    await logApiUsage({
      provider: "anthropic",
      category: "llm",
      model: body.model,
      function_name: opts.function_name,
      feature: opts.feature,
      user_id: opts.user_id,
      latency_ms: latency,
      status: resp.status === 429 ? "rate_limited" : "error",
      http_status: resp.status,
      error_message: text.slice(0, 500),
      metadata: opts.metadata,
    });
    throw new Error(`Anthropic ${resp.status}: ${text.slice(0, 200)}`);
  }

  const usage = data?.usage ?? {};
  await logApiUsage({
    provider: "anthropic",
    category: "llm",
    model: body.model,
    function_name: opts.function_name,
    feature: opts.feature,
    user_id: opts.user_id,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    total_tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
    latency_ms: latency,
    status: "success",
    http_status: resp.status,
    metadata: opts.metadata,
  });
  return data;
}

export async function callPerplexity(
  body: Record<string, any>,
  opts: CallOpts,
): Promise<any> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY missing");
  const start = Date.now();
  const resp = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const latency = Date.now() - start;
  const text = await resp.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch (_) {
    /* keep raw */
  }

  if (!resp.ok) {
    await logApiUsage({
      provider: "perplexity",
      category: "llm",
      model: body.model,
      function_name: opts.function_name,
      feature: opts.feature,
      user_id: opts.user_id,
      latency_ms: latency,
      status: resp.status === 429 ? "rate_limited" : "error",
      http_status: resp.status,
      error_message: text.slice(0, 500),
      metadata: opts.metadata,
    });
    throw new Error(`Perplexity ${resp.status}: ${text.slice(0, 200)}`);
  }

  const usage = data?.usage ?? {};
  await logApiUsage({
    provider: "perplexity",
    category: "llm",
    model: body.model,
    function_name: opts.function_name,
    feature: opts.feature,
    user_id: opts.user_id,
    input_tokens: usage.prompt_tokens,
    output_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
    latency_ms: latency,
    status: "success",
    http_status: resp.status,
    metadata: opts.metadata,
  });
  return data;
}

// Generic wrapper for non-LLM external APIs (Stripe, BrasilAPI, CNPJ, WhatsApp, etc.)
export async function trackExternalCall<T>(
  params: {
    provider: string;
    category: string;
    function_name: string;
    feature?: string;
    user_id?: string | null;
    metadata?: Record<string, any>;
  },
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const latency = Date.now() - start;
    await logApiUsage({
      provider: params.provider,
      category: params.category,
      function_name: params.function_name,
      feature: params.feature,
      user_id: params.user_id,
      latency_ms: latency,
      status: "success",
      metadata: params.metadata,
    });
    return result;
  } catch (e: any) {
    const latency = Date.now() - start;
    await logApiUsage({
      provider: params.provider,
      category: params.category,
      function_name: params.function_name,
      feature: params.feature,
      user_id: params.user_id,
      latency_ms: latency,
      status: "error",
      error_message: String(e?.message ?? e).slice(0, 500),
      metadata: params.metadata,
    });
    throw e;
  }
}

// ===== Drop-in fetch wrappers (minimal refactor) =====
// Replace `fetch(url, opts)` with `trackedAIFetch(url, opts, { function_name })`
// Auto-detects provider from URL, clones response to extract usage without consuming caller's body.
export async function trackedAIFetch(
  url: string,
  init: RequestInit,
  opts: { function_name: string; feature?: string; user_id?: string | null; model?: string; metadata?: Record<string, any> },
): Promise<Response> {
  const start = Date.now();
  const { provider, category } = detectProvider(url);

  let bodyModel: string | undefined = opts.model;
  try {
    if (!bodyModel && typeof init.body === "string") {
      const parsed = JSON.parse(init.body);
      bodyModel = parsed?.model;
    }
  } catch (_) { /* ignore */ }

  let resp: Response;
  try {
    resp = await fetch(url, init);
  } catch (e: any) {
    await logApiUsage({
      provider, category, model: bodyModel,
      function_name: opts.function_name, feature: opts.feature, user_id: opts.user_id,
      latency_ms: Date.now() - start, status: "error",
      error_message: String(e?.message ?? e).slice(0, 500), metadata: opts.metadata,
    });
    throw e;
  }
  const latency = Date.now() - start;

  if (!resp.ok) {
    const cloned = resp.clone();
    cloned.text().then((t) => {
      logApiUsage({
        provider, category, model: bodyModel,
        function_name: opts.function_name, feature: opts.feature, user_id: opts.user_id,
        latency_ms: latency, status: resp.status === 429 ? "rate_limited" : "error",
        http_status: resp.status, error_message: t.slice(0, 500), metadata: opts.metadata,
      });
    }).catch(() => {});
    return resp;
  }

  // Try to extract usage from cloned JSON (works for non-stream)
  const ct = resp.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const cloned = resp.clone();
    cloned.json().then((data: any) => {
      const u = extractUsage(data?.usage);
      logApiUsage({
        provider, category, model: data?.model ?? bodyModel,
        function_name: opts.function_name, feature: opts.feature, user_id: opts.user_id,
        input_tokens: u.input_tokens ?? undefined,
        output_tokens: u.output_tokens ?? undefined,
        total_tokens: u.total_tokens ?? undefined,
        latency_ms: latency, status: "success", http_status: resp.status, metadata: opts.metadata,
      });
    }).catch(() => {});
  } else {
    // streaming or non-json — log without tokens
    logApiUsage({
      provider, category, model: bodyModel,
      function_name: opts.function_name, feature: opts.feature, user_id: opts.user_id,
      latency_ms: latency, status: "success", http_status: resp.status,
      metadata: { ...opts.metadata, stream: true },
    });
  }
  return resp;
}
