// Equity Brain v2 — compute-drift-snapshot
// Calcula divergência entre matches v1 (equity_brain.matches) e v2 (equity_brain.matches_v2):
// overlap top-N, Spearman, distribuições. Insere snapshot global + per-cnpj para top empresas.
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
  const sa = new Set(a);
  const sb = new Set(b);
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const uni = new Set([...sa, ...sb]).size;
  return uni === 0 ? 0 : inter / uni;
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

function rank(arr: number[]): number[] {
  const sorted = arr.map((v, i) => ({ v, i })).sort((x, y) => y.v - x.v);
  const ranks = new Array(arr.length);
  sorted.forEach((s, idx) => (ranks[s.i] = idx + 1));
  return ranks;
}

function histogram(values: number[], bins = 10): number[] {
  const h = new Array(bins).fill(0);
  if (values.length === 0) return h;
  const min = 0, max = 1;
  for (const v of values) {
    const b = Math.min(bins - 1, Math.floor(((v - min) / (max - min)) * bins));
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

  let rowsProcessed = 0;
  let status = "success";
  let errorMsg: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const sampleCompanies = body.sample_companies ?? 50;
    const topN = body.top_n ?? 100;

    // Buscar amostra de cnpjs presentes em ambos motores
    const { data: cnpjsRaw, error: cnpjErr } = await supabase
      .schema("equity_brain")
      .from("matches_v2")
      .select("cnpj")
      .limit(2000);
    if (cnpjErr) throw cnpjErr;

    const uniqCnpjs = [...new Set((cnpjsRaw ?? []).map((r: any) => r.cnpj))].slice(0, sampleCompanies);

    // Snapshot global agregado
    const allV1: number[] = [];
    const allV2: number[] = [];
    const allOverlaps: number[] = [];
    const allSpearmans: number[] = [];
    const perCnpjResults: any[] = [];

    for (const cnpj of uniqCnpjs) {
      const [{ data: v1 }, { data: v2 }] = await Promise.all([
        supabase.schema("equity_brain").from("matches")
          .select("buyer_id,score").eq("cnpj", cnpj).order("score", { ascending: false }).limit(topN),
        supabase.schema("equity_brain").from("matches_v2")
          .select("buyer_id,score").eq("cnpj", cnpj).order("score", { ascending: false }).limit(topN),
      ]);

      if (!v1 || !v2 || v1.length === 0 || v2.length === 0) continue;

      const v1Ids = v1.map((m: any) => m.buyer_id);
      const v2Ids = v2.map((m: any) => m.buyer_id);
      const v1Map = new Map(v1.map((m: any) => [m.buyer_id, Number(m.score)]));
      const v2Map = new Map(v2.map((m: any) => [m.buyer_id, Number(m.score)]));

      const overlap = jaccard(v1Ids, v2Ids);
      const spear = spearman(v1Map, v2Map);
      const v1Scores = v1.map((m: any) => Number(m.score));
      const v2Scores = v2.map((m: any) => Number(m.score));
      const s1 = stats(v1Scores);
      const s2 = stats(v2Scores);

      allOverlaps.push(overlap);
      allSpearmans.push(spear);
      allV1.push(...v1Scores);
      allV2.push(...v2Scores);

      perCnpjResults.push({
        cnpj,
        top_n: topN,
        overlap_pct: overlap,
        spearman_corr: spear,
        mean_score_v1: s1.mean,
        mean_score_v2: s2.mean,
        std_v1: s1.std,
        std_v2: s2.std,
        histogram_v1: histogram(v1Scores),
        histogram_v2: histogram(v2Scores),
        sample_size: Math.min(v1.length, v2.length),
      });
    }

    // Insert per-cnpj
    if (perCnpjResults.length > 0) {
      const { error: insErr } = await supabase
        .schema("equity_brain")
        .from("drift_snapshots")
        .insert(perCnpjResults);
      if (insErr) throw insErr;
    }

    // Snapshot global
    const globalStats1 = stats(allV1);
    const globalStats2 = stats(allV2);
    const meanOverlap = allOverlaps.length > 0 ? allOverlaps.reduce((a, b) => a + b, 0) / allOverlaps.length : 0;
    const meanSpearman = allSpearmans.length > 0 ? allSpearmans.reduce((a, b) => a + b, 0) / allSpearmans.length : 0;

    const { error: globalErr } = await supabase
      .schema("equity_brain")
      .from("drift_snapshots")
      .insert({
        cnpj: null,
        top_n: topN,
        overlap_pct: meanOverlap,
        spearman_corr: meanSpearman,
        mean_score_v1: globalStats1.mean,
        mean_score_v2: globalStats2.mean,
        std_v1: globalStats1.std,
        std_v2: globalStats2.std,
        histogram_v1: histogram(allV1),
        histogram_v2: histogram(allV2),
        sample_size: uniqCnpjs.length,
        metadata: { companies_analyzed: perCnpjResults.length },
      });
    if (globalErr) throw globalErr;

    rowsProcessed = perCnpjResults.length + 1;

    // Log telemetria
    await supabase.schema("equity_brain").from("engine_runs").insert({
      engine_name: "compute-drift-snapshot",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "success",
      rows_processed: rowsProcessed,
      metadata: { sample_companies: sampleCompanies, top_n: topN, mean_overlap: meanOverlap, mean_spearman: meanSpearman },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({
      success: true,
      rows_processed: rowsProcessed,
      mean_overlap: meanOverlap,
      mean_spearman: meanSpearman,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    status = "error";
    errorMsg = e instanceof Error ? e.message : "Unknown error";
    console.error("compute-drift-snapshot error:", e);
    await supabase.schema("equity_brain").from("engine_runs").insert({
      engine_name: "compute-drift-snapshot",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status,
      rows_processed: rowsProcessed,
      error_message: errorMsg,
    }).then(() => {}, () => {});
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
