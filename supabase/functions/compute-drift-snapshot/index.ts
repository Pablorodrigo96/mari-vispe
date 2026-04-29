// Equity Brain v2 — compute-drift-snapshot (refactored as v2 time-series)
// Compara estado atual de matches v2 com o snapshot anterior mais recente.
// Primeiro snapshot é marcado como baseline (sem cálculo de drift).
//
// Reusa colunas existentes:
//   mean_score_v1 / std_v1 / histogram_v1 = "previous"
//   mean_score_v2 / std_v2 / histogram_v2 = "current"
//
// POST /compute-drift-snapshot
//   { sample_companies?: number = 50, top_n?: number = 100 }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a), sb = new Set(b);
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const uni = new Set([...sa, ...sb]).size;
  return uni === 0 ? 0 : inter / uni;
}

function rank(arr: number[]): number[] {
  const sorted = arr.map((v, i) => ({ v, i })).sort((x, y) => y.v - x.v);
  const ranks = new Array(arr.length);
  sorted.forEach((s, idx) => (ranks[s.i] = idx + 1));
  return ranks;
}

function spearman(a: Map<string, number>, b: Map<string, number>): number {
  const keys = [...a.keys()].filter((k) => b.has(k));
  if (keys.length < 3) return 0;
  const ra = rank(keys.map((k) => a.get(k)!));
  const rb = rank(keys.map((k) => b.get(k)!));
  const n = keys.length;
  let sumDsq = 0;
  for (let i = 0; i < n; i++) sumDsq += (ra[i] - rb[i]) ** 2;
  return 1 - (6 * sumDsq) / (n * (n * n - 1));
}

function histogram(values: number[], bins = 10): number[] {
  const h = new Array(bins).fill(0);
  for (const v of values) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor(v * bins)));
    h[b]++;
  }
  return h;
}

function stats(arr: number[]): { mean: number; std: number } {
  if (arr.length === 0) return { mean: 0, std: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
  return { mean, std };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = new Date().toISOString();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json().catch(() => ({}));
    const sampleCompanies = body.sample_companies ?? 50;
    const topN = body.top_n ?? 100;

    // 1) Snapshot atual: matches v2 ativos, agrupados por cnpj
    const { data: cur, error: curErr } = await supabase
      .schema("equity_brain")
      .from("matches")
      .select("cnpj, buyer_id, match_score")
      .eq("is_current", true)
      .eq("engine_version", "v2")
      .limit(20000);
    if (curErr) throw curErr;

    const curByCnpj = new Map<string, { buyer_id: string; score: number }[]>();
    for (const m of cur ?? []) {
      const s = Number(m.match_score ?? 0);
      const arr = curByCnpj.get(m.cnpj) ?? [];
      arr.push({ buyer_id: m.buyer_id, score: s });
      curByCnpj.set(m.cnpj, arr);
    }
    // Ordenar e cortar topN
    for (const [k, arr] of curByCnpj) {
      arr.sort((a, b) => b.score - a.score);
      curByCnpj.set(k, arr.slice(0, topN));
    }

    const cnpjs = [...curByCnpj.keys()].slice(0, sampleCompanies);

    // 2) Snapshot anterior: para cada cnpj, último drift_snapshot
    // Como pode ser o primeiro run, tratamos baseline.
    const { data: prevSnaps } = await supabase
      .schema("equity_brain")
      .from("drift_snapshots")
      .select("cnpj, snapshot_at, mean_score_v2, std_v2, histogram_v2, metadata")
      .in("cnpj", cnpjs)
      .order("snapshot_at", { ascending: false })
      .limit(2000);

    // Para drift de overlap/spearman, precisamos do conjunto de buyer_ids do snapshot anterior.
    // Como não armazenamos buyer_ids individualmente nas snapshots antigas, vamos guardar daqui em diante
    // em metadata.top_buyers. Buscamos o anterior se existir.
    const prevByCnpj = new Map<string, any>();
    for (const s of prevSnaps ?? []) {
      if (!prevByCnpj.has(s.cnpj)) prevByCnpj.set(s.cnpj, s);
    }

    const perCnpjResults: any[] = [];
    let baselineCount = 0;
    let comparedCount = 0;
    const allOverlaps: number[] = [];
    const allSpearmans: number[] = [];
    const allCurScores: number[] = [];

    for (const cnpj of cnpjs) {
      const curArr = curByCnpj.get(cnpj) ?? [];
      if (curArr.length === 0) continue;

      const curScores = curArr.map((x) => x.score);
      const curMap = new Map(curArr.map((x) => [x.buyer_id, x.score]));
      const curIds = curArr.map((x) => x.buyer_id);
      const sCur = stats(curScores);
      const histCur = histogram(curScores);
      allCurScores.push(...curScores);

      const prev = prevByCnpj.get(cnpj);
      const prevTopBuyers: string[] = prev?.metadata?.top_buyers ?? [];
      const prevTopScores: Record<string, number> = prev?.metadata?.top_scores ?? {};
      const isBaseline = !prev || prevTopBuyers.length === 0;

      let overlap: number | null = null;
      let spear: number | null = null;
      if (!isBaseline) {
        overlap = jaccard(curIds, prevTopBuyers);
        const prevMap = new Map(Object.entries(prevTopScores).map(([k, v]) => [k, Number(v)]));
        spear = spearman(curMap, prevMap);
        allOverlaps.push(overlap);
        allSpearmans.push(spear);
        comparedCount++;
      } else {
        baselineCount++;
      }

      perCnpjResults.push({
        cnpj,
        top_n: topN,
        overlap_pct: overlap,
        spearman_corr: spear,
        mean_score_v1: prev?.mean_score_v2 ?? null, // "previous"
        mean_score_v2: sCur.mean,                   // "current"
        std_v1: prev?.std_v2 ?? null,
        std_v2: sCur.std,
        histogram_v1: prev?.histogram_v2 ?? null,
        histogram_v2: histCur,
        sample_size: curArr.length,
        metadata: {
          is_baseline: isBaseline,
          mode: "v2_temporal",
          top_buyers: curIds,
          top_scores: Object.fromEntries(curArr.map((x) => [x.buyer_id, x.score])),
          previous_snapshot_at: prev?.snapshot_at ?? null,
        },
      });
    }

    // Insert per-cnpj
    if (perCnpjResults.length > 0) {
      // Insert em chunks para evitar payload gigante
      for (let off = 0; off < perCnpjResults.length; off += 50) {
        const slice = perCnpjResults.slice(off, off + 50);
        const { error: insErr } = await supabase
          .schema("equity_brain")
          .from("drift_snapshots")
          .insert(slice);
        if (insErr) throw insErr;
      }
    }

    // Snapshot global agregado
    const meanOverlap = allOverlaps.length > 0
      ? allOverlaps.reduce((a, b) => a + b, 0) / allOverlaps.length : null;
    const meanSpearman = allSpearmans.length > 0
      ? allSpearmans.reduce((a, b) => a + b, 0) / allSpearmans.length : null;
    const sGlobal = stats(allCurScores);

    // Buscar global anterior (cnpj IS NULL)
    const { data: prevGlobalArr } = await supabase
      .schema("equity_brain")
      .from("drift_snapshots")
      .select("snapshot_at, mean_score_v2, std_v2, histogram_v2")
      .is("cnpj", null)
      .order("snapshot_at", { ascending: false })
      .limit(1);
    const prevGlobal = prevGlobalArr?.[0];

    const { error: globalErr } = await supabase
      .schema("equity_brain")
      .from("drift_snapshots")
      .insert({
        cnpj: null,
        top_n: topN,
        overlap_pct: meanOverlap,
        spearman_corr: meanSpearman,
        mean_score_v1: prevGlobal?.mean_score_v2 ?? null,
        mean_score_v2: sGlobal.mean,
        std_v1: prevGlobal?.std_v2 ?? null,
        std_v2: sGlobal.std,
        histogram_v1: prevGlobal?.histogram_v2 ?? null,
        histogram_v2: histogram(allCurScores),
        sample_size: cnpjs.length,
        metadata: {
          mode: "v2_temporal",
          companies_analyzed: perCnpjResults.length,
          baseline_count: baselineCount,
          compared_count: comparedCount,
          previous_snapshot_at: prevGlobal?.snapshot_at ?? null,
        },
      });
    if (globalErr) throw globalErr;

    await supabase.schema("equity_brain").from("engine_runs").insert({
      engine_name: "compute-drift-snapshot",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "success",
      rows_processed: perCnpjResults.length + 1,
      metadata: { mode: "v2_temporal", baseline_count: baselineCount, compared_count: comparedCount, mean_overlap: meanOverlap, mean_spearman: meanSpearman },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({
      success: true,
      mode: "v2_temporal",
      cnpjs_processed: perCnpjResults.length,
      baseline_count: baselineCount,
      compared_count: comparedCount,
      mean_overlap: meanOverlap,
      mean_spearman: meanSpearman,
      global_mean_score: sGlobal.mean,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("compute-drift-snapshot error:", msg);
    await supabase.schema("equity_brain").from("engine_runs").insert({
      engine_name: "compute-drift-snapshot",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "error",
      error_message: msg,
    }).then(() => {}, () => {});
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
