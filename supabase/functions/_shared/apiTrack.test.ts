// Unit tests for apiTrack.ts pure helpers + trackedAIFetch integration.
// Covers all providers (Lovable AI, Anthropic, Perplexity) and external APIs
// (Stripe, BrasilAPI, CNPJ.ws). No network or DB calls.

// Set required env vars BEFORE importing the module (uses non-null assertions on import).
Deno.env.set("SUPABASE_URL", Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321");
Deno.env.set(
  "SUPABASE_SERVICE_ROLE_KEY",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "test-service-role-key",
);

import {
  assertEquals,
  assertAlmostEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { stub } from "https://deno.land/std@0.224.0/testing/mock.ts";

import {
  computeCostUsd,
  resolveTotalTokens,
  detectProvider,
  extractUsage,
  trackedAIFetch,
  type PricingRow,
} from "./apiTrack.ts";

// ============= Pricing seeds =============
const PRICING: Record<string, PricingRow> = {
  lovable_gemini_flash: {
    input_per_1m_usd: 0.075,
    output_per_1m_usd: 0.30,
    flat_per_call_usd: 0,
  },
  anthropic_sonnet: {
    input_per_1m_usd: 3.00,
    output_per_1m_usd: 15.00,
    flat_per_call_usd: 0,
  },
  perplexity_sonar: {
    input_per_1m_usd: 0.20,
    output_per_1m_usd: 0.20,
    flat_per_call_usd: 0.005,
  },
  stripe: { input_per_1m_usd: 0, output_per_1m_usd: 0, flat_per_call_usd: 0 },
  brasilapi: { input_per_1m_usd: 0, output_per_1m_usd: 0, flat_per_call_usd: 0 },
  cnpjws: { input_per_1m_usd: 0, output_per_1m_usd: 0, flat_per_call_usd: 0.01 },
  string_pricing: {
    input_per_1m_usd: "3.00",
    output_per_1m_usd: "15.00",
    flat_per_call_usd: "0",
  },
};

// ===========================================================================
// computeCostUsd
// ===========================================================================
Deno.test("computeCostUsd: null pricing returns 0", () => {
  assertEquals(computeCostUsd(null, 1000, 500), 0);
  assertEquals(computeCostUsd(undefined, 1000, 500), 0);
});

Deno.test("computeCostUsd: Lovable Gemini Flash 1M in + 500k out", () => {
  const cost = computeCostUsd(PRICING.lovable_gemini_flash, 1_000_000, 500_000);
  // 1.0 * 0.075 + 0.5 * 0.30 = 0.225
  assertAlmostEquals(cost, 0.225, 1e-9);
});

Deno.test("computeCostUsd: Anthropic Sonnet 10k in + 2k out", () => {
  const cost = computeCostUsd(PRICING.anthropic_sonnet, 10_000, 2_000);
  // 0.01 * 3 + 0.002 * 15 = 0.03 + 0.03 = 0.06
  assertAlmostEquals(cost, 0.06, 1e-9);
});

Deno.test("computeCostUsd: Perplexity Sonar with flat fee + tokens", () => {
  const cost = computeCostUsd(PRICING.perplexity_sonar, 5_000, 1_000);
  // 0.005 (flat) + 5_000/1M*0.20 + 1_000/1M*0.20 = 0.005 + 0.001 + 0.0002 = 0.0062
  assertAlmostEquals(cost, 0.0062, 1e-9);
});

Deno.test("computeCostUsd: null tokens treated as zero (flat-only)", () => {
  const cost = computeCostUsd(PRICING.cnpjws, null, undefined);
  assertAlmostEquals(cost, 0.01, 1e-9);
});

Deno.test("computeCostUsd: requestCount multiplies flat fee", () => {
  const cost = computeCostUsd(PRICING.cnpjws, 0, 0, 5);
  assertAlmostEquals(cost, 0.05, 1e-9);
});

Deno.test("computeCostUsd: pricing strings (Supabase numeric) are coerced", () => {
  const cost = computeCostUsd(PRICING.string_pricing, 10_000, 2_000);
  assertAlmostEquals(cost, 0.06, 1e-9);
});

Deno.test("computeCostUsd: zero-cost providers (Stripe, BrasilAPI) → 0", () => {
  assertEquals(computeCostUsd(PRICING.stripe, 0, 0), 0);
  assertEquals(computeCostUsd(PRICING.brasilapi, 100, 100), 0);
});

// ===========================================================================
// resolveTotalTokens (regression for ?? + || precedence bug)
// ===========================================================================
Deno.test("resolveTotalTokens: explicit total wins", () => {
  assertEquals(resolveTotalTokens(300, 100, 200), 300);
});

Deno.test("resolveTotalTokens: null total falls back to in+out", () => {
  assertEquals(resolveTotalTokens(null, 100, 200), 300);
});

Deno.test("resolveTotalTokens: undefined total falls back to in+out", () => {
  assertEquals(resolveTotalTokens(undefined, 100, 200), 300);
});

Deno.test("resolveTotalTokens: all undefined → null", () => {
  assertEquals(resolveTotalTokens(undefined, undefined, undefined), null);
});

Deno.test("resolveTotalTokens: all zero → null (falsy coercion)", () => {
  assertEquals(resolveTotalTokens(0, 0, 0), null);
});

Deno.test("resolveTotalTokens: null total + zero in + nonzero out", () => {
  assertEquals(resolveTotalTokens(null, 0, 50), 50);
});

Deno.test("resolveTotalTokens: all null → null", () => {
  assertEquals(resolveTotalTokens(null, null, null), null);
});

// ===========================================================================
// detectProvider
// ===========================================================================
Deno.test("detectProvider: Lovable AI chat completions", () => {
  assertEquals(
    detectProvider("https://ai.gateway.lovable.dev/v1/chat/completions"),
    { provider: "lovable_ai", category: "llm" },
  );
});

Deno.test("detectProvider: Lovable AI embeddings → category embedding", () => {
  assertEquals(
    detectProvider("https://ai.gateway.lovable.dev/v1/embeddings"),
    { provider: "lovable_ai", category: "embedding" },
  );
});

Deno.test("detectProvider: Anthropic", () => {
  assertEquals(
    detectProvider("https://api.anthropic.com/v1/messages"),
    { provider: "anthropic", category: "llm" },
  );
});

Deno.test("detectProvider: Perplexity", () => {
  assertEquals(
    detectProvider("https://api.perplexity.ai/chat/completions"),
    { provider: "perplexity", category: "llm" },
  );
});

Deno.test("detectProvider: unknown URL (Stripe/BrasilAPI/CNPJ)", () => {
  assertEquals(detectProvider("https://api.stripe.com/v1/customers"), {
    provider: "unknown",
    category: "llm",
  });
  assertEquals(detectProvider("https://brasilapi.com.br/api/cnpj/v1/123"), {
    provider: "unknown",
    category: "llm",
  });
  assertEquals(detectProvider("https://publica.cnpj.ws/cnpj/123"), {
    provider: "unknown",
    category: "llm",
  });
});

// ===========================================================================
// extractUsage
// ===========================================================================
Deno.test("extractUsage: OpenAI-style payload (Lovable AI / Perplexity)", () => {
  assertEquals(
    extractUsage({ prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }),
    { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
  );
});

Deno.test("extractUsage: Anthropic-style payload (no total_tokens)", () => {
  assertEquals(
    extractUsage({ input_tokens: 15, output_tokens: 25 }),
    { input_tokens: 15, output_tokens: 25, total_tokens: 40 },
  );
});

Deno.test("extractUsage: empty object → all null", () => {
  assertEquals(extractUsage({}), {
    input_tokens: null,
    output_tokens: null,
    total_tokens: null,
  });
});

Deno.test("extractUsage: null payload → all null", () => {
  assertEquals(extractUsage(null), {
    input_tokens: null,
    output_tokens: null,
    total_tokens: null,
  });
});

Deno.test("extractUsage: Perplexity sem total_tokens → soma in+out", () => {
  assertEquals(
    extractUsage({ prompt_tokens: 50, completion_tokens: 100 }),
    { input_tokens: 50, output_tokens: 100, total_tokens: 150 },
  );
});

// ===========================================================================
// trackedAIFetch (integration with stubbed fetch)
// ===========================================================================
function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.test("trackedAIFetch: 200 JSON → caller can read body (clone preserved)", async () => {
  const fetchStub = stub(globalThis, "fetch", () =>
    Promise.resolve(jsonResponse({
      model: "google/gemini-2.5-flash",
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      choices: [{ message: { content: "hi" } }],
    })),
  );
  try {
    const resp = await trackedAIFetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      { method: "POST", body: JSON.stringify({ model: "google/gemini-2.5-flash" }) },
      { function_name: "test-fn" },
    );
    assertEquals(resp.status, 200);
    const data = await resp.json();
    assertEquals(data.usage.total_tokens, 30);
    assertEquals(data.choices[0].message.content, "hi");
  } finally {
    fetchStub.restore();
  }
});

Deno.test("trackedAIFetch: 429 → response forwarded with same status", async () => {
  const fetchStub = stub(globalThis, "fetch", () =>
    Promise.resolve(new Response("rate limited", { status: 429 })),
  );
  try {
    const resp = await trackedAIFetch(
      "https://api.anthropic.com/v1/messages",
      { method: "POST", body: JSON.stringify({ model: "claude-3-5-sonnet" }) },
      { function_name: "test-fn" },
    );
    assertEquals(resp.status, 429);
    await resp.text(); // consume body to avoid leak
  } finally {
    fetchStub.restore();
  }
});

Deno.test("trackedAIFetch: network error is re-thrown", async () => {
  const fetchStub = stub(globalThis, "fetch", () =>
    Promise.reject(new Error("ECONNRESET")),
  );
  try {
    await assertRejects(
      () =>
        trackedAIFetch(
          "https://api.perplexity.ai/chat/completions",
          { method: "POST", body: JSON.stringify({ model: "sonar" }) },
          { function_name: "test-fn" },
        ),
      Error,
      "ECONNRESET",
    );
  } finally {
    fetchStub.restore();
  }
});

Deno.test("trackedAIFetch: embeddings URL → category 'embedding' resolved via detectProvider", async () => {
  // We can't directly observe the log call (fire-and-forget), but we verify
  // the URL-to-provider mapping via detectProvider — single source of truth.
  const { provider, category } = detectProvider(
    "https://ai.gateway.lovable.dev/v1/embeddings",
  );
  assertEquals(provider, "lovable_ai");
  assertEquals(category, "embedding");

  const fetchStub = stub(globalThis, "fetch", () =>
    Promise.resolve(jsonResponse({ data: [{ embedding: [0.1, 0.2] }] })),
  );
  try {
    const resp = await trackedAIFetch(
      "https://ai.gateway.lovable.dev/v1/embeddings",
      { method: "POST", body: JSON.stringify({ model: "text-embedding-3" }) },
      { function_name: "test-fn" },
    );
    assertEquals(resp.status, 200);
    await resp.json();
  } finally {
    fetchStub.restore();
  }
});
