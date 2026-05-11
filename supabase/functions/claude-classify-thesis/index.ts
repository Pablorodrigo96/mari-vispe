// Equity Brain — claude-classify-thesis
// Refina classificação de tese de M&A da empresa-alvo via Lovable AI Gateway.
// Auth: admin OR service_role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { callLovableAI } from "../_shared/apiTrack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT = `Você é um analista sênior de M&A da Vispe Capital, especializado em PMEs brasileiras.
Sua função é, dado um perfil de empresa-alvo + buyers compatíveis + signals já detectados,
produzir uma análise estratégica curta, em português, com:
1) tese_refinada: qual a melhor tese de M&A para esta empresa neste momento (escolhe entre: consolidacao_regional, sucessao_familiar, roll_up_setor, aquisicao_carteira, ganho_margem_governanca)
2) summary: 3-5 linhas conectando idade da empresa, setor, sócios, geografia e oportunidade
3) confidence: 0..1 — quão confiante você está
4) red_flags: lista de 0-3 riscos a investigar antes da abordagem

RESPONDA APENAS EM JSON VÁLIDO. Sem texto antes ou depois. Estrutura:
{"tese_refinada":"...","summary":"...","confidence":0.85,"red_flags":["..."]}`;

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
  const { data: roleData } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleData) return { ok: false, status: 403, error: "Forbidden: admin only", userId };
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
    const force_refresh: boolean = !!body.force_refresh;
    if (!cnpj) {
      return new Response(JSON.stringify({ error: "cnpj required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1) Carrega contexto
    const { data: company, error: cErr } = await supabase
      .schema("equity_brain" as any)
      .from("companies_scored")
      .select("*")
      .eq("cnpj", cnpj)
      .maybeSingle();
    if (cErr || !company) {
      return new Response(JSON.stringify({ error: "company not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signals } = await supabase
      .schema("equity_brain" as any)
      .from("company_signals")
      .select("signal_key, weight")
      .eq("cnpj", cnpj);

    const { data: matches } = await supabase
      .schema("equity_brain" as any)
      .from("matches_enriched")
      .select("buyer_nome, buyer_tipo, thesis_name, match_score")
      .eq("cnpj", cnpj)
      .order("match_score", { ascending: false })
      .limit(3);

    // 2) Skip se já tem summary e não é force
    const { data: existingOpp } = await supabase
      .schema("equity_brain" as any)
      .from("opportunities_ready")
      .select("ai_thesis_summary")
      .eq("cnpj", cnpj)
      .maybeSingle();

    if (!force_refresh && existingOpp?.ai_thesis_summary) {
      return new Response(JSON.stringify({
        skipped: true,
        cnpj,
        summary: existingOpp.ai_thesis_summary,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3) Monta prompt
    const userPrompt = `Empresa-alvo:
- Razão social: ${company.razao_social}
- CNPJ: ${cnpj}
- Setor M&A: ${company.setor_ma} (${company.cnae_descricao ?? ""})
- Localização: ${company.municipio}/${company.uf}
- Idade: ${company.idade_empresa ?? "?"} anos
- Capital social: R$ ${Number(company.capital_social ?? 0).toLocaleString("pt-BR")}
- Sócios: ${company.qtd_socios ?? "?"} (já cadastrada como listing: ${company.has_listing ? "sim" : "não"})
- Scores: M&A=${company.ma_score ?? 0}, Vispe=${company.vispe_score ?? 0}, Sucessão=${company.sucessao_score ?? 0}

Signals detectados (${(signals ?? []).length}):
${(signals ?? []).map((s: any) => `- ${s.signal_key} (peso ${s.weight})`).join("\n") || "- (nenhum)"}

Top 3 buyers compatíveis:
${(matches ?? []).map((m: any, i: number) => `${i + 1}. ${m.buyer_nome} (${m.buyer_tipo}) — tese "${m.thesis_name}" — match ${m.match_score}/100`).join("\n") || "- (nenhum match calculado)"}

Produza a análise no formato JSON pedido.`;

    // 4) Chama Claude
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
        function_name: "classify_thesis",
        cnpj,
        model: MODEL,
        prompt_input: { user: userPrompt },
        status: "error",
        error_message: `${claudeResp.status}: ${errText}`,
        latency_ms: Date.now() - t0,
        triggered_by: auth.userId,
      });
      return new Response(JSON.stringify({ error: "Claude API error", status: claudeResp.status, detail: errText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeJson = await claudeResp.json();
    const text: string = claudeJson.content?.[0]?.text ?? "";

    // 5) Parse JSON (tolera prefácio com ``` que Claude às vezes envia)
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
        function_name: "claude-classify-thesis", feature: "thesis_classification",
        input_tokens: tokensIn, output_tokens: tokensOut, total_tokens: tokensIn + tokensOut,
        status: "success", http_status: 200,
      });
    } catch (e) { console.error("apiTrack:", e); }

    // 6) Atualiza tabelas se parse foi bem
    if (parsed?.summary) {
      await supabase
        .schema("equity_brain" as any)
        .from("opportunities_ready")
        .update({ ai_thesis_summary: parsed.summary })
        .eq("cnpj", cnpj);

      await supabase
        .schema("equity_brain" as any)
        .from("matches")
        .update({
          ai_thesis_summary: parsed.summary,
          ai_confidence: parsed.confidence ?? null,
        })
        .eq("cnpj", cnpj)
        .eq("is_current", true);
    }

    // 7) Log
    await supabase.schema("equity_brain" as any).from("ai_runs").insert({
      function_name: "classify_thesis",
      cnpj,
      model: MODEL,
      prompt_input: { user: userPrompt },
      raw_response: text,
      parsed_output: parsed,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      cost_usd: costUsd,
      latency_ms: Date.now() - t0,
      status: parsed?.summary ? "success" : "partial",
      triggered_by: auth.userId,
    });

    return new Response(JSON.stringify({
      cnpj,
      parsed,
      tokens: { input: tokensIn, output: tokensOut },
      cost_usd: costUsd,
      latency_ms: Date.now() - t0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("claude-classify-thesis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
