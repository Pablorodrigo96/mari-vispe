// EB Compute ISP Stats — Fase 3
// Calcula agregados de mercado a partir de equity_brain.isp_market_entries
// Popula: isp_city_market_stats (HHI, fragmentation, leader) e
//         isp_company_market_stats (rollup_target, local_leader, sellability, etc.)
// NÃO toca em equity_brain.companies — segue regra de lista fria.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ComputeRequest {
  period_ref?: string; // YYYY-MM-DD; se omitido, usa o período mais recente
  calc_version?: string;
}

const CALC_VERSION_DEFAULT = "v1";
const CHUNK = 500;
const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: admin/advisor
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uerr } = await userClient.auth.getUser();
    if (uerr || !user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "advisor");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "forbidden: admin/advisor required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ComputeRequest = await req.json().catch(() => ({}));
    const calcVersion = body.calc_version || CALC_VERSION_DEFAULT;

    // 1) Define período de cálculo
    let period = body.period_ref;
    if (!period) {
      const { data: latest, error: perr } = await admin
        .schema("equity_brain")
        .from("isp_market_entries")
        .select("period_ref")
        .order("period_ref", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (perr) throw new Error("read latest period: " + perr.message);
      if (!latest?.period_ref) {
        return new Response(JSON.stringify({ error: "no entries found" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      period = latest.period_ref as string;
    }

    // 2) Carrega TODAS as entries do período (paginação)
    const PAGE = 1000;
    const entries: any[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin
        .schema("equity_brain")
        .from("isp_market_entries")
        .select("cnpj, provider_name_norm, uf, municipio, ibge_code, technology, accesses, period_ref")
        .eq("period_ref", period)
        .range(from, from + PAGE - 1);
      if (error) throw new Error("read entries: " + error.message);
      if (!data || data.length === 0) break;
      entries.push(...data);
      if (data.length < PAGE) break;
    }

    if (entries.length === 0) {
      return new Response(JSON.stringify({ ok: true, period, message: "no rows for period" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Período anterior (para growth) — escolhe o maior < period
    const { data: prevRow } = await admin
      .schema("equity_brain")
      .from("isp_market_entries")
      .select("period_ref")
      .lt("period_ref", period)
      .order("period_ref", { ascending: false })
      .limit(1)
      .maybeSingle();
    const prevPeriod = prevRow?.period_ref ?? null;

    const prevByCnpj = new Map<string, number>();
    if (prevPeriod) {
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await admin
          .schema("equity_brain")
          .from("isp_market_entries")
          .select("cnpj, accesses")
          .eq("period_ref", prevPeriod)
          .range(from, from + PAGE - 1);
        if (error) break;
        if (!data || data.length === 0) break;
        for (const r of data) {
          if (!r.cnpj) continue;
          prevByCnpj.set(r.cnpj, (prevByCnpj.get(r.cnpj) ?? 0) + (r.accesses ?? 0));
        }
        if (data.length < PAGE) break;
      }
    }

    // 4) Agrega por cidade (ibge_code)
    type CityAgg = {
      ibge: string; municipio: string | null; uf: string | null;
      total: number;
      byCnpj: Map<string, { name: string | null; accesses: number }>;
    };
    const cities = new Map<string, CityAgg>();

    for (const e of entries) {
      if (!e.ibge_code || !e.cnpj) continue;
      const acc = e.accesses ?? 0;
      let city = cities.get(e.ibge_code);
      if (!city) {
        city = { ibge: e.ibge_code, municipio: e.municipio, uf: e.uf, total: 0, byCnpj: new Map() };
        cities.set(e.ibge_code, city);
      }
      city.total += acc;
      const cur = city.byCnpj.get(e.cnpj) ?? { name: e.provider_name_norm, accesses: 0 };
      cur.accesses += acc;
      if (!cur.name) cur.name = e.provider_name_norm;
      city.byCnpj.set(e.cnpj, cur);
    }

    // 5) Stats por cidade
    type CityStat = {
      ibge_code: string; municipio: string | null; uf: string | null;
      total_accesses: number; n_providers: number;
      leader_cnpj: string | null; leader_share: number;
      top3_share: number; hhi: number;
      fragmentation_score: number; rollup_opportunity_score: number;
      dominant_player: boolean;
    };
    const cityStats: CityStat[] = [];
    // mapa auxiliar: cnpj -> [{ ibge, share, accesses, total_city, hhi }]
    const companyCityFootprint = new Map<string, Array<{
      ibge: string; uf: string | null; share: number; accesses: number;
      total_city: number; hhi: number; is_leader: boolean;
    }>>();

    for (const c of cities.values()) {
      if (c.total <= 0) continue;
      const arr = [...c.byCnpj.entries()].map(([cnpj, v]) => ({ cnpj, ...v }));
      arr.sort((a, b) => b.accesses - a.accesses);
      const shares = arr.map((a) => a.accesses / c.total);
      const hhi = shares.reduce((s, x) => s + x * x, 0); // 0..1
      const leader = arr[0];
      const leader_share = shares[0] ?? 0;
      const top3_share = shares.slice(0, 3).reduce((s, x) => s + x, 0);
      const fragmentation_score = clamp(1 - hhi); // 1 = mto fragmentado
      // rollup oportunity: alto quando fragmentado E mercado relevante
      const sizeBoost = clamp(Math.log10(Math.max(c.total, 10)) / 6); // ~1 quando ≥1M acessos
      const rollup_opportunity_score = clamp(0.7 * fragmentation_score + 0.3 * sizeBoost);
      const dominant_player = leader_share >= 0.5;

      cityStats.push({
        ibge_code: c.ibge,
        municipio: c.municipio,
        uf: c.uf,
        total_accesses: c.total,
        n_providers: arr.length,
        leader_cnpj: leader?.cnpj ?? null,
        leader_share: +leader_share.toFixed(6),
        top3_share: +top3_share.toFixed(6),
        hhi: +hhi.toFixed(6),
        fragmentation_score: +fragmentation_score.toFixed(6),
        rollup_opportunity_score: +rollup_opportunity_score.toFixed(6),
        dominant_player,
      });

      // footprint por empresa
      arr.forEach((a, idx) => {
        const list = companyCityFootprint.get(a.cnpj) ?? [];
        list.push({
          ibge: c.ibge, uf: c.uf,
          share: shares[idx],
          accesses: a.accesses,
          total_city: c.total,
          hhi,
          is_leader: idx === 0,
        });
        companyCityFootprint.set(a.cnpj, list);
      });
    }

    // 6) Stats por empresa (CNPJ)
    type CompanyStat = {
      cnpj: string; provider_name_norm: string | null;
      total_accesses: number; n_municipios: number; n_ufs: number;
      main_city_ibge: string | null; main_city_share: number;
      geographic_density: number; regional_presence_score: number;
      growth_vs_prev: number | null;
      fragmentation_exposure: number;
      rollup_target_score: number; local_leader_score: number;
      subscale_pressure_score: number; sellability_score: number;
      platform_potential_score: number;
    };
    const companyStats: CompanyStat[] = [];
    const nameByCnpj = new Map<string, string | null>();
    for (const e of entries) {
      if (!e.cnpj) continue;
      if (!nameByCnpj.has(e.cnpj)) nameByCnpj.set(e.cnpj, e.provider_name_norm);
    }

    for (const [cnpj, footprint] of companyCityFootprint.entries()) {
      const total = footprint.reduce((s, f) => s + f.accesses, 0);
      if (total <= 0) continue;
      const ufs = new Set(footprint.map((f) => f.uf).filter(Boolean));
      footprint.sort((a, b) => b.accesses - a.accesses);
      const main = footprint[0];
      const main_city_share_in_company = main.accesses / total; // concentração geográfica
      const main_city_share_in_market = main.share;             // share da empresa na principal cidade
      const n_munis = footprint.length;
      const n_ufs = ufs.size;

      // densidade: quanto a empresa concentra em poucas cidades (1 = 1 cidade só)
      const geographic_density = +clamp(main_city_share_in_company).toFixed(6);

      // presença regional: cobertura em UFs (até 5 UFs já é "regional")
      const regional_presence_score = +clamp(n_ufs / 5).toFixed(6);

      // crescimento vs período anterior
      let growth: number | null = null;
      if (prevPeriod) {
        const prev = prevByCnpj.get(cnpj) ?? 0;
        if (prev > 0) growth = +((total - prev) / prev).toFixed(6);
      }

      // exposição a mercados fragmentados (média ponderada de 1-HHI por participação)
      const fragExp = footprint.reduce((s, f) => s + (1 - f.hhi) * (f.accesses / total), 0);
      const fragmentation_exposure = +clamp(fragExp).toFixed(6);

      // local_leader_score: % de cidades onde é líder, ponderado por tamanho
      const leadAccesses = footprint.filter((f) => f.is_leader).reduce((s, f) => s + f.accesses, 0);
      const local_leader_score = +clamp(leadAccesses / total).toFixed(6);

      // rollup_target_score: pequeno + concentrado em cidade fragmentada + não líder
      const sizePenalty = clamp(1 - Math.log10(Math.max(total, 10)) / 6); // pequeno = score alto
      const rollup_target_score = +clamp(
        0.45 * sizePenalty + 0.35 * fragmentation_exposure + 0.20 * (1 - local_leader_score)
      ).toFixed(6);

      // subscale_pressure_score: subescala em cidade dominada por outro
      const dominatedAccesses = footprint
        .filter((f) => !f.is_leader && f.share < 0.1 && f.hhi >= 0.25)
        .reduce((s, f) => s + f.accesses, 0);
      const subscale_pressure_score = +clamp(dominatedAccesses / total).toFixed(6);

      // platform_potential_score: tem base + multi-cidade + alguma liderança
      const multiCityFactor = clamp(Math.log10(Math.max(n_munis, 1)) / 2); // ~1 com 100 cidades
      const sizeFactor = clamp(Math.log10(Math.max(total, 10)) / 6);
      const platform_potential_score = +clamp(
        0.4 * sizeFactor + 0.35 * multiCityFactor + 0.25 * local_leader_score
      ).toFixed(6);

      // sellability_score: subescala + crescimento fraco/negativo + pressão competitiva
      const growthSignal = growth == null ? 0.4 : (growth < 0 ? 1 : growth < 0.05 ? 0.7 : 0.2);
      const sellability_score = +clamp(
        0.45 * subscale_pressure_score + 0.30 * growthSignal + 0.25 * (1 - local_leader_score)
      ).toFixed(6);

      companyStats.push({
        cnpj,
        provider_name_norm: nameByCnpj.get(cnpj) ?? null,
        total_accesses: total,
        n_municipios: n_munis,
        n_ufs,
        main_city_ibge: main.ibge,
        main_city_share: +main_city_share_in_market.toFixed(6),
        geographic_density,
        regional_presence_score,
        growth_vs_prev: growth,
        fragmentation_exposure,
        rollup_target_score,
        local_leader_score,
        subscale_pressure_score,
        sellability_score,
        platform_potential_score,
      });
    }

    // 7) Persiste — upsert em chunks
    const now = new Date().toISOString();

    // Limpa stats antigas do período (idempotência total)
    await admin.schema("equity_brain").from("isp_city_market_stats")
      .delete().eq("period_ref", period);
    await admin.schema("equity_brain").from("isp_company_market_stats")
      .delete().eq("period_ref", period);

    let cityInserted = 0;
    for (let i = 0; i < cityStats.length; i += CHUNK) {
      const chunk = cityStats.slice(i, i + CHUNK).map((s) => ({
        ...s, period_ref: period, computed_at: now, calc_version: calcVersion,
      }));
      const { error, count } = await admin
        .schema("equity_brain").from("isp_city_market_stats")
        .insert(chunk, { count: "exact" });
      if (error) throw new Error(`city insert chunk ${i}: ${error.message}`);
      cityInserted += count ?? chunk.length;
    }

    let companyInserted = 0;
    for (let i = 0; i < companyStats.length; i += CHUNK) {
      const chunk = companyStats.slice(i, i + CHUNK).map((s) => ({
        ...s, period_ref: period, computed_at: now, calc_version: calcVersion,
      }));
      const { error, count } = await admin
        .schema("equity_brain").from("isp_company_market_stats")
        .insert(chunk, { count: "exact" });
      if (error) throw new Error(`company insert chunk ${i}: ${error.message}`);
      companyInserted += count ?? chunk.length;
    }

    return new Response(JSON.stringify({
      ok: true,
      period_ref: period,
      prev_period_ref: prevPeriod,
      calc_version: calcVersion,
      entries_processed: entries.length,
      cities_computed: cityInserted,
      companies_computed: companyInserted,
      next_step: "Fase 4 — Match Engine (sugestões cold via match-company-v2 com is_cold_suggestion=true)",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("[eb-compute-isp-stats] fatal", e);
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
