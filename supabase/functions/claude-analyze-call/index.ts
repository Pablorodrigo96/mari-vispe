// Equity Brain — claude-analyze-call (esqueleto Fase 6, conectado na Fase 7)
// Recebe transcrição/notas de uma call comercial e extrai sinais estruturados.
// Por ora apenas parseia e loga em ai_runs — não toca em company_signals.
// Auth: admin OR advisor OR service_role (BDR pode ser advisor).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  assertProviderAllowed,
  ProviderBudgetExceededError,
  ProviderDisabledError,
} from "../_shared/apiTrack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1024;
const COST_INPUT_PER_MTOK = 3;
const COST_OUTPUT_PER_MTOK = 15;

const SYSTEM_PROMPT = `Você é um analista de CRM. Recebe notas de uma call comercial e extrai sinais estruturados.
NUNCA invente. Se não souber, retorne null no campo.

RESPONDA APENAS EM JSON com a estrutura:
{
  "intencao_venda": 0.0,
  "timing_estimado": "agora" | "6m" | "12m+" | "nao" | null,
  "dor_principal": "sucessao" | "crescimento" | "financeiro" | "gestao" | "societario" | "outra" | null,
  "sinais_novos": ["signal_key1", "signal_key2"],
  "faturamento_mencionado": null,
  "ebitda_mencionado": null,
  "followup_recomendado": "texto curto"
}

Onde "intencao_venda" é um número entre 0 e 1.`;

async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401, error: "Unauthorized", userId: null as string | null };
  const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData } = await supabaseUser.auth.getClaims(token);
  const userId = claimsData?.claims?.sub ?? null;
  const isServiceRole = claimsData?.claims?.role === "service_role";
  if (isServiceRole) return { ok: true, userId: null };
  if (!userId) return { ok: false, status: 401, error: "Unauthorized", userId: null };
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "advisor");
  if (!allowed) return { ok: false, status: 403, error: "Forbidden: admin or advisor only", userId };
  return { ok: true, userId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const t0 = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await checkAuth(req, supabaseUrl, serviceKey);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Provider guard: kill switch + monthly budget
  try {
    await assertProviderAllowed("anthropic");
  } catch (e) {
    if (e instanceof ProviderDisabledError || e instanceof ProviderBudgetExceededError) {
      return new Response(JSON.stringify({ error: e.message, code: e.name }), {
        status: e.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    throw e;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const cnpj: string | undefined = body.cnpj;
    const call_notes: string | undefined = body.call_notes;
    const bdr_id: string | undefined = body.bdr_id;

    if (!cnpj || !call_notes) {
      return new Response(JSON.stringify({ error: "cnpj and call_notes required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (call_notes.length < 50) {
      return new Response(JSON.stringify({ error: "call_notes too short (min 50 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1) Contexto mínimo da empresa (não é obrigatório existir — analyze-call funciona mesmo sem)
    const { data: company } = await supabase
      .schema("equity_brain" as any)
      .from("companies_scored")
      .select("razao_social, setor_ma, uf, ma_score, sucessao_score")
      .eq("cnpj", cnpj)
      .maybeSingle();

    // 2) Catálogo de signal_keys (orienta o modelo a sugerir só keys válidas)
    const { data: catalog } = await supabase
      .schema("equity_brain" as any)
      .from("signal_catalog")
      .select("signal_key");
    const validKeys = (catalog ?? []).map((c: any) => c.signal_key);

    const userPrompt = `Empresa: ${company?.razao_social ?? "(desconhecida)"} — CNPJ ${cnpj}
Setor: ${company?.setor_ma ?? "?"} | UF: ${company?.uf ?? "?"}
Scores: M&A=${company?.ma_score ?? "?"}, Sucessão=${company?.sucessao_score ?? "?"}

Signal keys válidas no catálogo (use APENAS estas em "sinais_novos"):
${validKeys.join(", ") || "(catálogo vazio)"}

Notas da call (transcrição/anotações do BDR):
"""
${call_notes}
"""

Extraia os sinais no formato JSON pedido.`;

    // 3) Claude
    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      console.error("Claude API error:", claudeResp.status, errText);
      await supabase.schema("equity_brain" as any).from("ai_runs").insert({
        function_name: "analyze_call",
        cnpj,
        model: MODEL,
        prompt_input: { user: userPrompt, call_notes },
        status: "error",
        error_message: `${claudeResp.status}: ${errText}`,
        latency_ms: Date.now() - t0,
        triggered_by: bdr_id ?? auth.userId,
      });
      return new Response(JSON.stringify({ error: "Claude API error", status: claudeResp.status, detail: errText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeJson = await claudeResp.json();
    const text: string = claudeJson.content?.[0]?.text ?? "";

    let parsed: any = null;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      parsed = null;
    }

    const tokensIn = claudeJson.usage?.input_tokens ?? 0;
    const tokensOut = claudeJson.usage?.output_tokens ?? 0;
    const costUsd = (tokensIn * COST_INPUT_PER_MTOK / 1_000_000) + (tokensOut * COST_OUTPUT_PER_MTOK / 1_000_000);

    try {
      const { logApiUsage } = await import("../_shared/apiTrack.ts");
      await logApiUsage({
        provider: "anthropic", category: "llm", model: MODEL,
        function_name: "claude-analyze-call", feature: "call_analysis",
        input_tokens: tokensIn, output_tokens: tokensOut, total_tokens: tokensIn + tokensOut,
        status: "success", http_status: 200,
      });
    } catch (e) { console.error("apiTrack:", e); }

    // NOTA Fase 6: NÃO escreve em company_signals nem em matches.status.
    // Fase 7 (feedback loop) vai consumir parsed_output deste log para:
    //  - inserir signals novos (sinais_novos)
    //  - ajustar timing/status no pipeline
    //  - alimentar embeddings semânticos

    await supabase.schema("equity_brain" as any).from("ai_runs").insert({
      function_name: "analyze_call",
      cnpj,
      model: MODEL,
      prompt_input: { user: userPrompt, call_notes },
      raw_response: text,
      parsed_output: parsed,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      cost_usd: costUsd,
      latency_ms: Date.now() - t0,
      status: parsed ? "success" : "partial",
      triggered_by: bdr_id ?? auth.userId,
    });

    return new Response(JSON.stringify({
      cnpj,
      parsed,
      tokens: { input: tokensIn, output: tokensOut },
      cost_usd: costUsd,
      latency_ms: Date.now() - t0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("claude-analyze-call error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
