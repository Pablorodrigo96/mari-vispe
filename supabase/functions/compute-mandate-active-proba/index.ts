// Equity Brain v2 — compute-mandate-active-proba
// Estima p(mandato ativo nos próximos 12m) via fusão Bayesiana de sinais probabilísticos.
// Lê equity_brain.company_signals (com p_true e evidence_strength) e grava o sinal agregado
// `mandate_active_proba` (valor 0..1) na própria tabela. Roda em SHADOW mode — não muda v1.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Sinais que evidenciam mandato ativo (com peso de evidência subjetivo, log-odds delta)
// delta_logit_positive: quanto soma na chance se sinal=true e p_true=1
// Estes são priors do modelo — refinados via update-buyer-revealed-thetas no futuro.
const MANDATE_SIGNALS: Record<string, { delta: number; description: string }> = {
  intencao_venda_explicita:        { delta: 3.0, description: "Sócio declarou intenção de venda" },
  contratacao_advisor_recente:     { delta: 2.5, description: "Contratou M&A advisor" },
  fundador_60_plus:                { delta: 1.2, description: "Fundador >= 60 anos" },
  sucessao_sem_herdeiros:          { delta: 1.4, description: "Sem sucessão clara" },
  pe_sponsor_age_4plus:            { delta: 2.0, description: "PE sponsor há 4+ anos (saída esperada)" },
  recent_capital_raise_below_target:{ delta: 1.0, description: "Captação recente abaixo do esperado" },
  founder_health_event:            { delta: 1.8, description: "Evento de saúde do fundador" },
  mandate_active_proba_high:       { delta: 0,   description: "(meta-signal — não usar como input)" },
};

// Sinais que reduzem chance (founder ativo recente, capitalização forte)
const PAUSE_SIGNALS: Record<string, { delta: number }> = {
  pause_signal_capital_raise_recent: { delta: -2.5 },
  pause_signal_founder_active_press: { delta: -1.0 },
  pause_signal_recent_acquisition:   { delta: -2.0 },
};

// Prior: chance base de qualquer empresa estar com mandato ativo nos próximos 12m ~ 4%
const PRIOR_LOGIT = Math.log(0.04 / 0.96); // ~ -3.18

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// Decay temporal (Ornstein-Uhlenbeck simplificado): peso cai conforme idade da evidência
function freshnessFactor(evidenceTs: string | null, decayDays: number): number {
  if (!evidenceTs) return 0.6; // sem timestamp = penaliza
  const ageDays = (Date.now() - new Date(evidenceTs).getTime()) / 86400000;
  if (ageDays < 0) return 1.0;
  const halfLife = decayDays || 365;
  return Math.pow(0.5, ageDays / halfLife);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await supabaseUser.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    const isServiceRole = claimsData?.claims?.role === "service_role";

    if (!isServiceRole) {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const adminCheck = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data: roleData } = await adminCheck
        .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const cnpjs: string[] | undefined = Array.isArray(body.cnpjs) ? body.cnpjs : undefined;
    const limit: number = Math.min(Number(body.limit ?? 500), 5000);
    const dryRun: boolean = Boolean(body.dry_run ?? false);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Engine run tracking (Fase 5 — observabilidade)
    const runStart = Date.now();
    const { data: runRow } = await supabase.schema("equity_brain" as any).from("engine_runs").insert({
      engine: "compute-mandate-active-proba",
      status: "running",
      triggered_by: isServiceRole ? "cron" : "manual",
      metadata: { cnpjs: cnpjs?.length ?? null, limit, dry_run: dryRun },
    }).select("id").single();
    const runId = runRow?.id ?? null;
    async function finishRun(status: "success" | "error", rowsProcessed: number, errorMsg?: string) {
      if (!runId) return;
      await supabase.schema("equity_brain" as any).from("engine_runs").update({
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - runStart,
        rows_processed: rowsProcessed,
        status,
        error_message: errorMsg ?? null,
      }).eq("id", runId);
    }

    try {
    // Carrega CNPJs alvo
    let companyQuery = supabase.schema("equity_brain" as any).from("companies").select("cnpj").limit(limit);
    if (cnpjs?.length) companyQuery = companyQuery.in("cnpj", cnpjs);
    const { data: companies, error: companiesErr } = await companyQuery;
    if (companiesErr) throw companiesErr;

    const targetCnpjs = (companies ?? []).map((c: any) => c.cnpj);
    if (targetCnpjs.length === 0) {
      await finishRun("success", 0);
      return new Response(JSON.stringify({ ok: true, processed: 0, results: [], run_id: runId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca sinais relevantes
    const relevantKeys = [...Object.keys(MANDATE_SIGNALS), ...Object.keys(PAUSE_SIGNALS)];
    const { data: signals, error: signalsErr } = await supabase
      .schema("equity_brain" as any)
      .from("company_signals")
      .select("cnpj, signal_key, p_true, evidence_strength, evidence_ts, freshness_decay_days, signal_value, weight")
      .in("cnpj", targetCnpjs)
      .in("signal_key", relevantKeys);
    if (signalsErr) throw signalsErr;

    // Agrupa por cnpj
    const sigByCnpj = new Map<string, any[]>();
    for (const s of signals ?? []) {
      if (!sigByCnpj.has(s.cnpj)) sigByCnpj.set(s.cnpj, []);
      sigByCnpj.get(s.cnpj)!.push(s);
    }

    const results: any[] = [];
    const upserts: any[] = [];

    for (const cnpj of targetCnpjs) {
      let logit = PRIOR_LOGIT;
      const contributions: any[] = [];
      const sigs = sigByCnpj.get(cnpj) ?? [];

      for (const sig of sigs) {
        const positive = MANDATE_SIGNALS[sig.signal_key];
        const negative = PAUSE_SIGNALS[sig.signal_key];
        const meta = positive ?? negative;
        if (!meta || meta.delta === 0) continue;

        // p_true * evidence_strength * freshness  -> peso efetivo do sinal
        const pTrue = sig.p_true != null ? Number(sig.p_true) : (sig.signal_value ? 0.85 : 0.0);
        const evidence = sig.evidence_strength != null ? Number(sig.evidence_strength) : 0.7;
        const fresh = freshnessFactor(sig.evidence_ts, Number(sig.freshness_decay_days ?? 365));
        const effective = pTrue * evidence * fresh;
        const contribution = meta.delta * effective;

        logit += contribution;
        contributions.push({
          signal_key: sig.signal_key,
          delta_logit: Number(contribution.toFixed(3)),
          p_true: pTrue,
          evidence,
          freshness: Number(fresh.toFixed(3)),
        });
      }

      const proba = sigmoid(logit);
      // Confidence interval grosseiro (aproximação log-normal nos pesos)
      const totalEvidence = contributions.reduce((s, c) => s + Math.abs(c.delta_logit), 0);
      const stdLogit = totalEvidence > 0 ? 1.0 / Math.sqrt(totalEvidence + 1) : 1.5;
      const ciLow = sigmoid(logit - 1.645 * stdLogit);
      const ciHigh = sigmoid(logit + 1.645 * stdLogit);

      results.push({
        cnpj,
        mandate_active_proba: Number(proba.toFixed(4)),
        ci_90: [Number(ciLow.toFixed(4)), Number(ciHigh.toFixed(4))],
        n_contributions: contributions.length,
        contributions,
      });

      // Persiste como sinal agregado (idempotente)
      upserts.push({
        cnpj,
        signal_key: "mandate_active_proba_v2",
        signal_value: proba >= 0.3,
        signal_text: `${(proba * 100).toFixed(1)}%`,
        weight: Math.round(proba * 100),
        p_true: Number(proba.toFixed(4)),
        evidence_strength: Math.min(1, totalEvidence / 5),
        evidence_ts: new Date().toISOString(),
        freshness_decay_days: 90,
        source: "compute-mandate-active-proba",
        confidence: Number((1 - (ciHigh - ciLow)).toFixed(3)),
      });
    }

    if (!dryRun && upserts.length > 0) {
      const { error: upsertErr } = await supabase
        .schema("equity_brain" as any)
        .from("company_signals")
        .upsert(upserts, { onConflict: "cnpj,signal_key" });
      if (upsertErr) console.error("upsert error:", upsertErr);
    }

    return new Response(
      JSON.stringify({ ok: true, processed: results.length, dry_run: dryRun, results: results.slice(0, 100) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("compute-mandate-active-proba error:", err);
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
