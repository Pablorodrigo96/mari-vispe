// Equity Brain v2 — match-company-v2
// Motor híbrido adaptativo: regras + archetype weights + Bayesian Buyer Model (BBM).
// Calcula match_score, p_close_12m (com IC), price bands (p10/p50/p90 via comparáveis),
// hard filters (regional consolidator -> exige UF própria/vizinha), feature contributions
// estilo SHAP, e abstenção quando dados insuficientes.
// SHADOW mode: grava em equity_brain.matches com engine_version='v2', preservando a v1.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UF_NEIGHBORS: Record<string, string[]> = {
  AC:["AM","RO"], AL:["PE","SE","BA"], AM:["AC","RO","MT","PA","RR"], AP:["PA"],
  BA:["MG","ES","SE","AL","PE","PI","TO","GO","DF"], CE:["PI","PB","PE","RN"],
  DF:["GO","MG"], ES:["RJ","MG","BA"], GO:["DF","MT","MS","TO","BA","MG"],
  MA:["PI","TO","PA"], MG:["SP","RJ","ES","BA","GO","DF","MS"],
  MS:["MT","GO","MG","SP","PR"], MT:["RO","AM","PA","TO","GO","MS"],
  PA:["AP","MA","TO","MT","AM","RR"], PB:["RN","CE","PE"], PE:["PB","CE","PI","BA","AL"],
  PI:["MA","TO","BA","PE","CE"], PR:["SC","SP","MS"], RJ:["SP","MG","ES"],
  RN:["CE","PB"], RO:["AC","AM","MT"], RR:["AM","PA"], RS:["SC"], SC:["RS","PR"],
  SE:["BA","AL"], SP:["PR","MG","RJ","MS"], TO:["MA","PI","BA","GO","MT","PA"],
};
const PORTE_ORDER = ["ME", "EPP", "MEDIA", "GRANDE"];

// ---------- Helpers ----------

function sigmoid(x: number) { return 1 / (1 + Math.exp(-x)); }

// Etapa 2: pgvector retorna embedding como string "[0.1,0.2,...]" via PostgREST.
function parseEmbedding(raw: any): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.map(Number);
  if (typeof raw === "string") {
    try {
      const trimmed = raw.trim().replace(/^\[|\]$/g, "");
      if (!trimmed) return null;
      return trimmed.split(",").map(Number);
    } catch { return null; }
  }
  return null;
}

function cosineSimilarity(a: number[] | null, b: number[] | null): number {
  if (!a || !b || a.length !== b.length) return 0.5; // neutro quando não há embedding
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0.5;
  // cosine similarity ∈ [-1, 1] — normaliza para [0, 1]
  return Math.max(0, Math.min(1, (dot / denom + 1) / 2));
}

// Etapa 1.5 (Oráculo v3): assinatura estendida com sinais numéricos por CNPJ.
// `numericByCnpj`: Map<cnpj, Map<signal_key, signal_value>> permite ler valores reais
// (seller_intent_score, sweet_spot_fadiga, tempo_atividade_anos) sem queries extras.
// `semanticFit`: passado pelo loop principal a partir do cosseno entre embeddings (Etapa 2).
function computeFeatures(
  company: any,
  buyer: any,
  sigSet: Set<string>,
  mandateProba: number,
  sigNumeric: Map<string, number>,
  semanticFit: number,
  wavePressure: number,
) {
  // Setor
  let setor = 0;
  if (buyer.setores_interesse?.includes(company.setor_ma)) setor = 1.0;
  else if (buyer.subsetores_interesse?.includes(company.subsetor_ma)) setor = 0.7;

  // Geografia
  let geografia = 0;
  if (!buyer.ufs_interesse?.length) geografia = 0.6;
  else if (buyer.ufs_interesse.includes(company.uf)) geografia = 1.0;
  else if ((UF_NEIGHBORS[company.uf] ?? []).some((n) => buyer.ufs_interesse.includes(n))) geografia = 0.5;

  // Densidade local (proxy: # de buyers do mesmo arquétipo na UF) — placeholder usa geografia
  const densidade_local = geografia;

  // Porte
  let tamanho = 0;
  if (company.porte && buyer.porte_alvo?.includes(company.porte)) tamanho = 1.0;
  else if (company.porte && buyer.porte_alvo?.length) {
    const idx = PORTE_ORDER.indexOf(company.porte);
    const adj = (buyer.porte_alvo ?? []).some((p: string) => Math.abs(PORTE_ORDER.indexOf(p) - idx) === 1);
    tamanho = adj ? 0.5 : 0;
  }

  // Timing (= prob mandato ativo)
  const timing = mandateProba;

  // Financeiro (Etapa 1.5): combina faixa de ticket COM "fadiga do fundador".
  // Empresas no sweet spot 8-20a + bom ticket performam melhor em M&A.
  let financeiro = 0.5;
  const fat = Number(company.faturamento_estimado ?? 0);
  if (fat > 0 && buyer.ticket_min && buyer.ticket_max) {
    if (fat >= buyer.ticket_min && fat <= buyer.ticket_max) financeiro = 1.0;
    else if (fat >= buyer.ticket_min * 0.6 && fat <= buyer.ticket_max * 1.4) financeiro = 0.6;
    else financeiro = 0.2;
  }
  // Boost por sweet spot (idade da empresa 8-20a) — sinal forte de janela ideal
  const sweet = sigNumeric.get("sweet_spot_fadiga") ?? null;
  if (sweet === 1) financeiro = Math.min(1.0, financeiro + 0.15);
  // Penalidade leve para empresas muito jovens
  const tempo = sigNumeric.get("tempo_atividade_anos") ?? null;
  if (tempo !== null && tempo < 3) financeiro = Math.max(0.1, financeiro - 0.2);

  // Tese fit (sinais)
  const tese = sigSet.size >= 3 ? 0.8 : sigSet.size >= 1 ? 0.5 : 0.2;

  // Recorrência (heurística por CNAE de serviços)
  const recorrencia = sigSet.has("alto_recorrencia") ? 1.0 : 0.4;

  // Cross-sell (heurística)
  const cross_sell = sigSet.has("cross_sell_obvio") ? 1.0 : 0.5;

  // Governança
  const governanca = sigSet.has("governanca_estabelecida") ? 1.0 : 0.5;

  // Sponsor age (PE)
  const sponsor_age = sigSet.has("pe_sponsor_age_4plus") ? 1.0 : 0.0;

  // Vertical fit (SaaS vertical specialists)
  const vertical_fit = setor;

  // Placeholders restantes (não há substituto fiel ainda — manter constante para não injetar ruído)
  const marca_regional = 0.5;
  const vagas_medicina = sigSet.has("possui_vagas_medicina") ? 1.0 : 0.0;
  const contratos_longos = sigSet.has("contratos_longo_prazo") ? 1.0 : 0.4;
  const verticalizacao = 0.5;
  const regulatorio = 0.5;

  // Etapa 2 (Oráculo v3): semantic_fit substitui placeholder sinergia_movel.
  // 0.5 quando algum lado não tem embedding (preserva neutralidade).
  const sinergia_movel = semanticFit;

  // Horizonte (Etapa 1.5): empresas com tempo_atividade >= 8 anos têm horizonte mais maduro
  const tempoForHorizonte = sigNumeric.get("tempo_atividade_anos") ?? null;
  const horizonte = tempoForHorizonte === null ? 0.6
    : tempoForHorizonte >= 8 ? 0.85
    : tempoForHorizonte >= 4 ? 0.6
    : 0.35;

  // NOVA FEATURE Etapa 1.5: seller_intent — sinal direto da empresa querer/precisar vender
  const seller_intent = sigNumeric.get("seller_intent_score") ?? 0.3;

  return {
    setor, geografia, densidade_local, tamanho, timing, financeiro, tese, recorrencia,
    cross_sell, governanca, sponsor_age, vertical_fit, marca_regional, vagas_medicina,
    contratos_longos, verticalizacao, regulatorio, sinergia_movel, horizonte, seller_intent,
  };
}

function applyHardFilters(company: any, buyer: any, archetype: string | null, features: any): { excluded: boolean; reason?: string } {
  // Consolidador regional estrito: empresa precisa estar em UF do buyer ou vizinha terrestre
  if (archetype === "consolidator_regional_strict") {
    if (features.geografia < 0.5) {
      return { excluded: true, reason: "geo_non_contiguous_for_regional_consolidator" };
    }
  }
  // Buyer pausado
  if (buyer.pause_signal) return { excluded: true, reason: "buyer_paused" };

  // Empresa inativa
  if (company.situacao_cadastral && company.situacao_cadastral !== "ATIVA") {
    return { excluded: true, reason: "company_inactive" };
  }
  return { excluded: false };
}

function blendWeights(defaults: Record<string, number>, revealed: Record<string, { mean: number; n: number }>): Record<string, number> {
  // Bayesian shrinkage: w = (n*revealed + k*default) / (n + k), k=10 prior strength
  const k = 10;
  const blended: Record<string, number> = {};
  for (const [feat, w] of Object.entries(defaults)) {
    const r = revealed[feat];
    if (r && r.n > 0) {
      blended[feat] = (r.n * r.mean + k * w) / (r.n + k);
    } else {
      blended[feat] = w;
    }
  }
  // Normaliza
  const sum = Object.values(blended).reduce((a, b) => a + b, 0) || 1;
  for (const k2 of Object.keys(blended)) blended[k2] /= sum;
  return blended;
}

function priceBandsFromComparables(comparables: any[], company: any): {
  ev_p10: number | null; ev_p50: number | null; ev_p90: number | null;
  multiple_p10: number | null; multiple_p50: number | null; multiple_p90: number | null;
} {
  if (!comparables.length) {
    return { ev_p10:null, ev_p50:null, ev_p90:null, multiple_p10:null, multiple_p50:null, multiple_p90:null };
  }
  const evs = comparables.map((c) => Number(c.ev_brl)).filter((n) => n > 0).sort((a,b)=>a-b);
  const muls = comparables.map((c) => Number(c.ebitda_multiple)).filter((n) => n > 0).sort((a,b)=>a-b);
  const pct = (arr: number[], p: number) => arr.length ? arr[Math.min(arr.length - 1, Math.floor((arr.length - 1) * p))] : null;

  const ebitda = Number(company.ebitda_estimado ?? 0);
  let ev10 = pct(evs, 0.1), ev50 = pct(evs, 0.5), ev90 = pct(evs, 0.9);
  // Se temos EBITDA da empresa, sobrescreve EV usando múltiplos
  if (ebitda > 0 && muls.length > 0) {
    ev10 = ebitda * (pct(muls, 0.1) ?? 0);
    ev50 = ebitda * (pct(muls, 0.5) ?? 0);
    ev90 = ebitda * (pct(muls, 0.9) ?? 0);
  }
  return {
    ev_p10: ev10, ev_p50: ev50, ev_p90: ev90,
    multiple_p10: pct(muls, 0.1), multiple_p50: pct(muls, 0.5), multiple_p90: pct(muls, 0.9),
  };
}

// ---------- Server ----------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type":"application/json" }});
      const adminCheck = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data: roleData } = await adminCheck.from("user_roles").select("role").eq("user_id", userId).eq("role","admin").maybeSingle();
      if (!roleData) return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type":"application/json" }});
    }

    const body = await req.json().catch(() => ({}));
    const cnpjs: string[] | undefined = Array.isArray(body.cnpjs) ? body.cnpjs : undefined;
    const buyerIds: string[] | undefined = Array.isArray(body.buyer_ids) ? body.buyer_ids : undefined;
    const limitCompanies = Math.min(Number(body.limit_companies ?? 50), 200);
    const persist = Boolean(body.persist ?? true);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Engine run tracking (Fase 5 — observabilidade)
    const runStart = Date.now();
    const { data: runRow } = await supabase.schema("equity_brain" as any).from("engine_runs").insert({
      engine: "match-company-v2",
      status: "running",
      triggered_by: isServiceRole ? "cron" : "manual",
      metadata: { cnpjs: cnpjs?.length ?? null, buyer_ids: buyerIds?.length ?? null, limit_companies: limitCompanies, persist },
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
    // Carrega dados (Etapa 2: inclui embedding)
    let cQuery = supabase.schema("equity_brain" as any).from("companies")
      .select("cnpj, razao_social, uf, municipio, setor_ma, subsetor_ma, porte, situacao_cadastral, faturamento_estimado, ebitda_estimado, embedding").limit(limitCompanies);
    if (cnpjs?.length) cQuery = cQuery.in("cnpj", cnpjs);
    const { data: companies, error: cErr } = await cQuery;
    if (cErr) throw cErr;
    if (!companies?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { ...corsHeaders, "Content-Type":"application/json" }});
    }

    let bQuery = supabase.schema("equity_brain" as any).from("buyers")
      .select("id, nome, archetype_id, ufs_interesse, setores_interesse, subsetores_interesse, porte_alvo, ticket_min, ticket_max, pause_signal, pe_sponsor_name, embedding");
    if (buyerIds?.length) bQuery = bQuery.in("id", buyerIds);
    const { data: buyers, error: bErr } = await bQuery;
    if (bErr) throw bErr;

    const { data: archetypes } = await supabase.schema("equity_brain" as any).from("buyer_archetypes").select("id, default_weights");
    const archetypeIdx = new Map<string, any>();
    (archetypes ?? []).forEach((a: any) => archetypeIdx.set(a.id, a));

    // Etapa 1.5: agora puxa também signal_value (para seller_intent_score, sweet_spot_fadiga, tempo_atividade_anos)
    const { data: signals } = await supabase.schema("equity_brain" as any)
      .from("company_signals").select("cnpj, signal_key, signal_value, p_true").in("cnpj", companies.map((c:any)=>c.cnpj));
    const sigByCnpj = new Map<string, Set<string>>();
    const numericByCnpj = new Map<string, Map<string, number>>();
    const mandateByCnpj = new Map<string, number>();
    for (const s of signals ?? []) {
      if (!sigByCnpj.has(s.cnpj)) sigByCnpj.set(s.cnpj, new Set());
      sigByCnpj.get(s.cnpj)!.add(s.signal_key);
      if (!numericByCnpj.has(s.cnpj)) numericByCnpj.set(s.cnpj, new Map());
      if (s.signal_value != null) numericByCnpj.get(s.cnpj)!.set(s.signal_key, Number(s.signal_value));
      if (s.signal_key === "mandate_active_proba_v2" && s.p_true != null) {
        mandateByCnpj.set(s.cnpj, Number(s.p_true));
      }
    }

    const { data: revealedRaw } = await supabase.schema("equity_brain" as any)
      .from("buyer_revealed_thetas").select("buyer_id, feature_name, posterior_mean, n_observations")
      .in("buyer_id", (buyers ?? []).map((b:any)=>b.id));
    const revealedByBuyer = new Map<string, Record<string, { mean: number; n: number }>>();
    for (const r of revealedRaw ?? []) {
      if (!revealedByBuyer.has(r.buyer_id)) revealedByBuyer.set(r.buyer_id, {});
      revealedByBuyer.get(r.buyer_id)![r.feature_name] = { mean: Number(r.posterior_mean), n: Number(r.n_observations) };
    }

    // Comparáveis canônicos (todos — filtramos por setor depois)
    const { data: canonicals } = await supabase.schema("equity_brain" as any)
      .from("canonical_transactions").select("*");

    // Scores agregados (ma_score) por CNPJ
    const { data: scoresRows } = await supabase.schema("equity_brain" as any)
      .from("company_scores").select("cnpj, ma_score").eq("is_current", true)
      .in("cnpj", companies.map((c:any)=>c.cnpj));
    const maScoreByCnpj = new Map<string, number>();
    for (const s of scoresRows ?? []) maScoreByCnpj.set(s.cnpj, Number(s.ma_score ?? 0));

    // Etapa 2: pré-parse de embeddings buyers (uma vez)
    const buyerEmbByBuyer = new Map<string, number[] | null>();
    for (const b of buyers ?? []) buyerEmbByBuyer.set(b.id, parseEmbedding((b as any).embedding));

    const newMatches: any[] = [];

    for (const company of companies) {
      const sigSet = sigByCnpj.get(company.cnpj) ?? new Set<string>();
      const sigNumeric = numericByCnpj.get(company.cnpj) ?? new Map<string, number>();
      const mandateProba = mandateByCnpj.get(company.cnpj) ?? 0.04;
      const companyEmb = parseEmbedding((company as any).embedding);

      for (const buyer of buyers ?? []) {
        const archetype = buyer.archetype_id;
        const archetypeData = archetype ? archetypeIdx.get(archetype) : null;
        const buyerEmb = buyerEmbByBuyer.get(buyer.id) ?? null;
        const semanticFit = (companyEmb && buyerEmb) ? cosineSimilarity(companyEmb, buyerEmb) : 0.5;
        const features = computeFeatures(company, buyer, sigSet, mandateProba, sigNumeric, semanticFit);
        const hard = applyHardFilters(company, buyer, archetype, features);

        if (hard.excluded) continue;

        // Mistura pesos: arquétipo × revealed thetas
        // Etapas 1.5 + 2: incluímos seller_intent (0.10) e sinergia_movel/semantic (0.05) nos defaults.
        // O blend normaliza no final, então a soma não precisa ser 1.0.
        const baseDefaults = archetypeData?.default_weights ?? { setor: 0.3, geografia: 0.2, tese: 0.2, tamanho: 0.15, financeiro: 0.15 };
        const defaults = { ...baseDefaults, seller_intent: 0.10, sinergia_movel: 0.05 };
        const revealed = revealedByBuyer.get(buyer.id) ?? {};
        const weights = blendWeights(defaults, revealed);

        // Score linear ponderado
        let score = 0;
        const contributions: any[] = [];
        for (const [feat, w] of Object.entries(weights)) {
          const v = (features as any)[feat];
          if (v == null || isNaN(v)) continue;
          const c = v * w;
          score += c;
          contributions.push({ feature: feat, weight: Number(w.toFixed(3)), value: Number(v.toFixed(3)), contribution: Number(c.toFixed(3)) });
        }
        const matchScore = Math.round(Math.max(0, Math.min(1, score)) * 100);

        // Abstenção: dados pobres
        const dataConfidence = (sigSet.size > 0 ? 0.4 : 0) + (company.faturamento_estimado ? 0.3 : 0) + (company.ebitda_estimado ? 0.3 : 0);
        const abstain = dataConfidence < 0.3;

        if (matchScore < 25 && !abstain) continue;

        // p_close_12m: combina match_score, mandate_proba e capacidade financeira
        const pClose = sigmoid(-2.0 + 3.5 * (matchScore / 100) + 1.5 * mandateProba + 0.5 * features.financeiro);
        const pCloseStd = 0.08 + 0.15 * (1 - dataConfidence);
        const pCloseLower = Math.max(0, pClose - 1.645 * pCloseStd);
        const pCloseUpper = Math.min(1, pClose + 1.645 * pCloseStd);

        // Comparáveis: filtra por setor
        const comparables = (canonicals ?? []).filter((c: any) =>
          c.sector === company.setor_ma || c.sector === company.subsetor_ma,
        ).slice(0, 12);
        const bands = priceBandsFromComparables(comparables, company);

        // Counterfactual: o que mudaria o score significativamente
        const counterfactual: string[] = [];
        if (features.timing < 0.3) counterfactual.push("Se mandato ativo confirmado, score subiria ~20pts");
        if (features.geografia < 0.5) counterfactual.push("Se UF compatível, score subiria ~15pts");
        if (!company.ebitda_estimado) counterfactual.push("Sem EBITDA — bandas de preço seriam mais estreitas");

        const reasons = contributions
          .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
          .slice(0, 4)
          .map((c) => ({ key: c.feature, contribution: c.contribution, value: c.value }));

        newMatches.push({
          cnpj: company.cnpj,
          buyer_id: buyer.id,
          thesis_key: archetype ?? "generic",
          match_score: matchScore,
          setor_fit: features.setor,
          geografia_fit: features.geografia,
          porte_fit: features.tamanho,
          tese_fit: features.tese,
          ma_score_emp: maScoreByCnpj.get(company.cnpj) ?? null,
          reasons,
          p_close_12m: Number(pClose.toFixed(4)),
          p_close_ci_lower: Number(pCloseLower.toFixed(4)),
          p_close_ci_upper: Number(pCloseUpper.toFixed(4)),
          ev_p10: bands.ev_p10, ev_p50: bands.ev_p50, ev_p90: bands.ev_p90,
          multiple_p10: bands.multiple_p10, multiple_p50: bands.multiple_p50, multiple_p90: bands.multiple_p90,
          data_confidence: Number(dataConfidence.toFixed(3)),
          abstain,
          abstain_reason: abstain ? "insufficient_data" : null,
          buyer_archetype: archetype,
          counterfactual,
          comparables: comparables.map((c: any) => ({
            target_name: c.target_name, buyer_name: c.buyer_name, ev_brl: c.ev_brl, ebitda_multiple: c.ebitda_multiple, deal_date: c.deal_date,
          })),
          feature_contributions: contributions,
          engine_version: "v2",
          status: "new",
          is_current: true,
          computed_at: new Date().toISOString(),
        });
      }
    }

    if (persist && newMatches.length) {
      // Insere v2 sem deletar v1: chave (cnpj, buyer_id, thesis_key, engine_version)
      // Marca anteriores v2 como não-current
      const cnpjList = [...new Set(newMatches.map((m) => m.cnpj))];
      await supabase.schema("equity_brain" as any).from("matches")
        .update({ is_current: false }).eq("engine_version","v2").in("cnpj", cnpjList);

      // Insere em chunks
      const CHUNK = 200;
      for (let i = 0; i < newMatches.length; i += CHUNK) {
        const { error: insErr } = await supabase.schema("equity_brain" as any)
          .from("matches").insert(newMatches.slice(i, i + CHUNK));
        if (insErr) console.error("insert chunk error:", insErr);
      }
    }

    await finishRun("success", newMatches.length);
    return new Response(JSON.stringify({
      ok: true, processed: newMatches.length, persisted: persist,
      sample: newMatches.slice(0, 5), run_id: runId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (innerErr: any) {
      await finishRun("error", 0, innerErr?.message ?? String(innerErr));
      throw innerErr;
    }
  } catch (err: any) {
    console.error("match-company-v2 error:", err);
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
