// EB Match ISP Cold — Fase 4
// Gera sugestões frias (matches.is_cold_suggestion=true) cruzando isp_company_market_stats
// com buyers que ativam teses ISP. NÃO cria companies, NÃO dispara notificações.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Req {
  period_ref?: string;
  min_thesis_fit?: number;   // default 0.35
  min_match_score?: number;  // default 0.40
  max_per_buyer?: number;    // default 50
  dry_run?: boolean;
}

const ISP_THESES = [
  "isp_consolidacao_regional",
  "isp_sucessao",
  "isp_fadiga_regulatoria",
  "isp_capex_estresse",
  "isp_carteira_premium",
];

const ISP_SECTOR_KEYWORDS = [
  "ISP", "PROVEDOR", "PROVEDORES", "BANDA LARGA", "TELECOM",
  "FIBRA", "INTERNET", "TELECOMUNICACOES", "TELECOMUNICAÇÕES",
];

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const norm = (s: any) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

// fit por tese a partir dos scores da empresa
function thesisFit(thesisKey: string, c: any): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const r = (label: string, v: number) => { if (v >= 0.5) reasons.push(`${label}=${v.toFixed(2)}`); };

  switch (thesisKey) {
    case "isp_consolidacao_regional": {
      const s = 0.55 * (c.rollup_target_score ?? 0) + 0.30 * (c.fragmentation_exposure ?? 0) + 0.15 * (c.regional_presence_score ?? 0);
      r("rollup_target", c.rollup_target_score ?? 0);
      r("fragmentation", c.fragmentation_exposure ?? 0);
      return { score: clamp(s), reasons };
    }
    case "isp_sucessao": {
      // proxy: sellability + não-líder + alguma escala
      const sizeFactor = clamp(Math.log10(Math.max(c.total_accesses ?? 0, 10)) / 5);
      const s = 0.50 * (c.sellability_score ?? 0) + 0.30 * (1 - (c.local_leader_score ?? 0)) + 0.20 * sizeFactor;
      r("sellability", c.sellability_score ?? 0);
      return { score: clamp(s), reasons };
    }
    case "isp_fadiga_regulatoria": {
      const s = 0.55 * (c.subscale_pressure_score ?? 0) + 0.25 * (c.sellability_score ?? 0) + 0.20 * (1 - (c.local_leader_score ?? 0));
      r("subscale_pressure", c.subscale_pressure_score ?? 0);
      return { score: clamp(s), reasons };
    }
    case "isp_capex_estresse": {
      const growth = c.growth_vs_prev;
      const growthBad = growth == null ? 0.4 : (growth < 0 ? 1 : growth < 0.05 ? 0.7 : 0.2);
      const s = 0.45 * (c.subscale_pressure_score ?? 0) + 0.35 * growthBad + 0.20 * (c.fragmentation_exposure ?? 0);
      r("subscale_pressure", c.subscale_pressure_score ?? 0);
      if (growth != null && growth < 0) reasons.push(`growth=${(growth * 100).toFixed(1)}%`);
      return { score: clamp(s), reasons };
    }
    case "isp_carteira_premium": {
      const s = 0.50 * (c.local_leader_score ?? 0) + 0.30 * (c.platform_potential_score ?? 0) + 0.20 * (c.regional_presence_score ?? 0);
      r("local_leader", c.local_leader_score ?? 0);
      r("platform_potential", c.platform_potential_score ?? 0);
      return { score: clamp(s), reasons };
    }
    default:
      return { score: 0, reasons: [] };
  }
}

// fit buyer×empresa: setor (precisa ISP), geografia (UFs), porte (ticket vs accesses)
function buyerFit(buyer: any, c: any, footprintUfs: Set<string>): {
  setor: number; geo: number; porte: number; reasons: string[]
} {
  const reasons: string[] = [];

  // setor
  const buyerSectors = (buyer.setores_interesse ?? []).map(norm);
  const setorHit = buyerSectors.length === 0
    ? 0.4 // buyer genérico
    : (buyerSectors.some((s: string) => ISP_SECTOR_KEYWORDS.some((kw) => s.includes(kw))) ? 1.0 : 0);
  if (setorHit >= 1) reasons.push("setor=ISP/Telecom");

  // geografia
  const buyerUfs = new Set((buyer.ufs_interesse ?? []).map((u: any) => String(u).toUpperCase()));
  let geo = 0.5; // sem preferência declarada
  if (buyerUfs.size > 0 && footprintUfs.size > 0) {
    const inter = [...footprintUfs].filter((u) => buyerUfs.has(u));
    geo = inter.length === 0 ? 0 : clamp(inter.length / footprintUfs.size);
    if (inter.length > 0) reasons.push(`geo=${inter.slice(0, 3).join(",")}`);
  }

  // porte: usa total_accesses como proxy (1 acesso ≈ ARPU R$80/mês ≈ R$960/ano → EV ~3-5x receita)
  const accesses = c.total_accesses ?? 0;
  const estRevenue = accesses * 960;          // R$/ano
  const estEV = estRevenue * 4;               // EV proxy
  let porte = 0.5;
  if (buyer.ticket_min != null && buyer.ticket_max != null) {
    if (estEV >= Number(buyer.ticket_min) && estEV <= Number(buyer.ticket_max)) {
      porte = 1.0;
      reasons.push(`porte_OK(EV~${(estEV / 1e6).toFixed(1)}M)`);
    } else if (estEV >= Number(buyer.ticket_min) * 0.5 && estEV <= Number(buyer.ticket_max) * 1.5) {
      porte = 0.6;
    } else porte = 0.1;
  }

  return { setor: setorHit, geo, porte, reasons };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uerr } = await userClient.auth.getUser();
    if (uerr || !user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "advisor");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "forbidden: admin/advisor required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body: Req = await req.json().catch(() => ({}));
    const minThesisFit = body.min_thesis_fit ?? 0.35;
    const minMatchScore = body.min_match_score ?? 0.40;
    const maxPerBuyer = body.max_per_buyer ?? 50;
    const dry = !!body.dry_run;

    // 1) Período
    let period = body.period_ref;
    if (!period) {
      const { data: latest } = await admin.schema("equity_brain")
        .from("isp_company_market_stats")
        .select("period_ref")
        .order("period_ref", { ascending: false })
        .limit(1).maybeSingle();
      period = latest?.period_ref as string | undefined;
    }
    if (!period) return new Response(JSON.stringify({ error: "no isp_company_market_stats found — run Fase 3 first" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // 2) Carrega stats das empresas (paginado)
    const PAGE = 1000;
    const companies: any[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin.schema("equity_brain")
        .from("isp_company_market_stats")
        .select("cnpj, provider_name_norm, total_accesses, n_municipios, n_ufs, geographic_density, regional_presence_score, growth_vs_prev, fragmentation_exposure, rollup_target_score, local_leader_score, subscale_pressure_score, sellability_score, platform_potential_score")
        .eq("period_ref", period)
        .range(from, from + PAGE - 1);
      if (error) throw new Error("read company stats: " + error.message);
      if (!data || data.length === 0) break;
      companies.push(...data);
      if (data.length < PAGE) break;
    }
    if (companies.length === 0) return new Response(JSON.stringify({ ok: true, message: "no companies for period" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // 3) Footprint UF por CNPJ (a partir de market_entries do mesmo período)
    const ufByCnpj = new Map<string, Set<string>>();
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin.schema("equity_brain")
        .from("isp_market_entries")
        .select("cnpj, uf")
        .eq("period_ref", period)
        .range(from, from + PAGE - 1);
      if (error) break;
      if (!data || data.length === 0) break;
      for (const r of data) {
        if (!r.cnpj || !r.uf) continue;
        const set = ufByCnpj.get(r.cnpj) ?? new Set<string>();
        set.add(String(r.uf).toUpperCase());
        ufByCnpj.set(r.cnpj, set);
      }
      if (data.length < PAGE) break;
    }

    // 4) Carrega buyers ativos
    const { data: buyers, error: bErr } = await admin.schema("equity_brain")
      .from("buyers")
      .select("id, nome, setores_interesse, ufs_interesse, ticket_min, ticket_max, status, qualification_status")
      .or("status.eq.ativo,status.is.null");
    if (bErr) throw new Error("read buyers: " + bErr.message);
    if (!buyers || buyers.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "no active buyers" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5) Pré-calcula fit por tese para cada empresa
    type CompThesisFit = { thesis_key: string; score: number; reasons: string[] };
    const compThesisFits = new Map<string, CompThesisFit[]>();
    const thesisLinks: any[] = [];
    for (const c of companies) {
      const fits: CompThesisFit[] = [];
      for (const t of ISP_THESES) {
        const f = thesisFit(t, c);
        if (f.score >= minThesisFit) fits.push({ thesis_key: t, ...f });
      }
      if (fits.length > 0) {
        compThesisFits.set(c.cnpj, fits);
        // Salva o melhor link CNPJ→tese
        const best = fits.reduce((a, b) => (b.score > a.score ? b : a));
        thesisLinks.push({
          cnpj: c.cnpj,
          thesis_key: best.thesis_key,
          fit_score: best.score,
          reasons: { signals: best.reasons, period_ref: period },
        });
      }
    }

    // 6) Cross-join filtrado: empresa × buyer × tese
    type Match = {
      cnpj: string; buyer_id: string; thesis_key: string;
      match_score: number; setor_fit: number; geografia_fit: number;
      porte_fit: number; tese_fit: number;
      reasons: any;
    };
    const matchesByBuyer = new Map<string, Match[]>();

    for (const buyer of buyers) {
      const arr: Match[] = [];
      for (const c of companies) {
        const fits = compThesisFits.get(c.cnpj);
        if (!fits) continue;
        const ufs = ufByCnpj.get(c.cnpj) ?? new Set<string>();
        const bf = buyerFit(buyer, c, ufs);
        if (bf.setor === 0) continue; // buyer não atua em ISP
        // pega a melhor tese para esse buyer
        const best = fits.reduce((a, b) => (b.score > a.score ? b : a));
        const score = clamp(
          0.30 * best.score +    // tese
          0.25 * bf.setor +
          0.25 * bf.geo +
          0.20 * bf.porte
        );
        if (score < minMatchScore) continue;
        arr.push({
          cnpj: c.cnpj,
          buyer_id: buyer.id,
          thesis_key: best.thesis_key,
          match_score: +score.toFixed(6),
          setor_fit: +bf.setor.toFixed(6),
          geografia_fit: +bf.geo.toFixed(6),
          porte_fit: +bf.porte.toFixed(6),
          tese_fit: +best.score.toFixed(6),
          reasons: {
            cold: true,
            source: "ANATEL_BANDA_LARGA_FIXA",
            period_ref: period,
            provider: c.provider_name_norm,
            thesis_signals: best.reasons,
            buyer_signals: bf.reasons,
            footprint_ufs: [...ufs].slice(0, 5),
            est_ev_brl: (c.total_accesses ?? 0) * 960 * 4,
            scores: {
              rollup: c.rollup_target_score,
              local_leader: c.local_leader_score,
              sellability: c.sellability_score,
              platform: c.platform_potential_score,
              subscale_pressure: c.subscale_pressure_score,
              growth: c.growth_vs_prev,
            },
          },
        });
      }
      arr.sort((a, b) => b.match_score - a.match_score);
      matchesByBuyer.set(buyer.id, arr.slice(0, maxPerBuyer));
    }

    const allMatches: Match[] = [];
    for (const arr of matchesByBuyer.values()) allMatches.push(...arr);

    if (dry) {
      return new Response(JSON.stringify({
        dry_run: true,
        period_ref: period,
        companies_evaluated: companies.length,
        companies_with_thesis_fit: compThesisFits.size,
        active_buyers: buyers.length,
        candidate_matches: allMatches.length,
        per_buyer_top: [...matchesByBuyer.entries()].map(([bid, arr]) => ({
          buyer_id: bid,
          n: arr.length,
          top: arr.slice(0, 3),
        })).slice(0, 10),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 7) Persiste — limpa cold do período/teses ISP e re-grava
    const { error: delErr } = await admin.schema("equity_brain")
      .from("matches")
      .delete()
      .eq("is_cold_suggestion", true)
      .in("thesis_key", ISP_THESES);
    if (delErr) console.warn("[match-isp-cold] delete prev failed:", delErr.message);

    // Upsert isp_thesis_link (idempotente por unique cnpj+thesis_key)
    let linksUpserted = 0;
    const CHUNK = 500;
    for (let i = 0; i < thesisLinks.length; i += CHUNK) {
      const chunk = thesisLinks.slice(i, i + CHUNK);
      const { error } = await admin.schema("equity_brain")
        .from("isp_thesis_link")
        .upsert(chunk, { onConflict: "cnpj,thesis_key" });
      if (error) console.warn("[isp_thesis_link upsert]", error.message);
      else linksUpserted += chunk.length;
    }

    // Insert matches em chunks
    let inserted = 0;
    let insErrors = 0;
    for (let i = 0; i < allMatches.length; i += CHUNK) {
      const chunk = allMatches.slice(i, i + CHUNK).map((m) => ({
        ...m,
        is_cold_suggestion: true,
        is_current: true,
        status: "novo",
        engine_version: "isp-cold-v1",
        ai_confidence: 0.5,
      }));
      const { error, count } = await admin.schema("equity_brain")
        .from("matches")
        .insert(chunk, { count: "exact" });
      if (error) { insErrors += chunk.length; console.error("[matches insert]", error.message); }
      else inserted += count ?? chunk.length;
    }

    return new Response(JSON.stringify({
      ok: true,
      period_ref: period,
      companies_with_thesis_fit: compThesisFits.size,
      thesis_links_upserted: linksUpserted,
      matches_inserted: inserted,
      matches_failed: insErrors,
      buyers_targeted: buyers.length,
      note: "Sugestões frias (is_cold_suggestion=true). NÃO criam companies, NÃO disparam notificações.",
      next_step: "Fase 5 — Tela de revisão + promote-cold-isp",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("[eb-match-isp-cold] fatal", e);
    return new Response(JSON.stringify({ error: e.message ?? String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
