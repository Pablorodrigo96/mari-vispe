import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MatchInboxRow = {
  id: string;
  cnpj: string;
  buyer_id: string;
  match_score: number;
  thesis_key: string | null;
  status: string | null;
  setor_fit: number | null;
  geografia_fit: number | null;
  porte_fit: number | null;
  tese_fit: number | null;
  computed_at: string | null;
  // company side
  razao_social: string | null;
  codename: string | null;
  uf: string | null;
  setor_ma: string | null;
  faturamento_estimado: number | null;
  has_listing: boolean | null;
  listing_id: string | null;
  // buyer side
  buyer_nome: string | null;
  buyer_tipo: string | null;
  buyer_ufs: string[] | null;
  buyer_setores: string[] | null;
  ticket_min: number | null;
  ticket_max: number | null;
  // mandate (if any)
  mandate_id: string | null;
  mandate_outcome: string | null;
  // ── Explainability (v2 engine, all optional — v1 rows leave them null)
  reasons?: any[] | null;
  ai_thesis_summary?: string | null;
  ai_pitch?: string | null;
  ai_confidence?: number | null;
  p_close_12m?: number | null;
  p_close_ci_lower?: number | null;
  p_close_ci_upper?: number | null;
  ev_p10?: number | null;
  ev_p50?: number | null;
  ev_p90?: number | null;
  multiple_p10?: number | null;
  multiple_p50?: number | null;
  multiple_p90?: number | null;
  data_confidence?: number | null;
  abstain?: boolean | null;
  abstain_reason?: string | null;
  buyer_archetype?: string | null;
  sector_cycle_phase?: number | null;
  counterfactual?: string | null;
  comparables?: any[] | null;
  feature_contributions?: Array<{ feature: string; weight: number; value: number; contribution: number }> | null;
  engine_version?: string | null;
  ma_score_emp?: number | null;
};

type Filters = {
  minScore?: number;
  uf?: string | null;
  setor?: string | null;
  onlyWithMandate?: boolean;
  limit?: number;
};

export function useMatchInbox(filters: Filters = {}) {
  const { minScore = 0, uf, setor, onlyWithMandate = false, limit = 200 } = filters;
  return useQuery({
    queryKey: ["match-inbox", minScore, uf, setor, onlyWithMandate, limit],
    queryFn: async () => {
      // 1) base matches
      let q = (supabase as any)
        .schema("equity_brain")
        .from("matches")
        .select(
          "id,cnpj,buyer_id,match_score,thesis_key,status,setor_fit,geografia_fit,porte_fit,tese_fit,computed_at"
        )
        .eq("is_current", true)
        .gte("match_score", minScore)
        .order("match_score", { ascending: false })
        .limit(limit);
      const { data: matches, error } = await q;
      if (error) throw error;
      const rows = (matches ?? []) as any[];
      if (rows.length === 0) return [] as MatchInboxRow[];

      const cnpjs = Array.from(new Set(rows.map((r) => r.cnpj)));
      const buyerIds = Array.from(new Set(rows.map((r) => r.buyer_id)));

      const [companiesR, buyersR, mandatesR] = await Promise.all([
        (supabase as any)
          .schema("equity_brain")
          .from("companies")
          .select("cnpj,razao_social,codename,uf,setor_ma,faturamento_estimado,has_listing,listing_id")
          .in("cnpj", cnpjs),
        (supabase as any)
          .schema("equity_brain")
          .from("buyers")
          .select("id,nome,tipo,ufs_interesse,setores_interesse,ticket_min,ticket_max")
          .in("id", buyerIds),
        (supabase as any)
          .schema("equity_brain")
          .from("mandates")
          .select("id,company_cnpj,outcome")
          .in("company_cnpj", cnpjs),
      ]);

      const cMap = new Map((companiesR.data ?? []).map((c: any) => [c.cnpj, c]));
      const bMap = new Map((buyersR.data ?? []).map((b: any) => [b.id, b]));
      const mMap = new Map(
        (mandatesR.data ?? [])
          .filter((m: any) => m.outcome !== "cancelado")
          .map((m: any) => [m.company_cnpj, m])
      );

      let enriched: MatchInboxRow[] = rows.map((r) => {
        const c: any = cMap.get(r.cnpj) ?? {};
        const b: any = bMap.get(r.buyer_id) ?? {};
        const m: any = mMap.get(r.cnpj) ?? {};
        return {
          id: r.id,
          cnpj: r.cnpj,
          buyer_id: r.buyer_id,
          match_score: Number(r.match_score ?? 0),
          thesis_key: r.thesis_key,
          status: r.status,
          setor_fit: r.setor_fit,
          geografia_fit: r.geografia_fit,
          porte_fit: r.porte_fit,
          tese_fit: r.tese_fit,
          computed_at: r.computed_at,
          razao_social: c.razao_social ?? null,
          codename: c.codename ?? null,
          uf: c.uf ?? null,
          setor_ma: c.setor_ma ?? null,
          faturamento_estimado: c.faturamento_estimado ?? null,
          has_listing: c.has_listing ?? null,
          listing_id: c.listing_id ?? null,
          buyer_nome: b.nome ?? null,
          buyer_tipo: b.tipo ?? null,
          buyer_ufs: b.ufs_interesse ?? null,
          buyer_setores: b.setores_interesse ?? null,
          ticket_min: b.ticket_min ?? null,
          ticket_max: b.ticket_max ?? null,
          mandate_id: m.id ?? null,
          mandate_outcome: m.outcome ?? null,
        };
      });

      if (uf) enriched = enriched.filter((r) => r.uf === uf);
      if (setor) enriched = enriched.filter((r) => r.setor_ma === setor);
      if (onlyWithMandate) enriched = enriched.filter((r) => !!r.mandate_id);

      return enriched;
    },
    staleTime: 60_000,
  });
}

export function tierForScore(score: number, percentiles?: { hot: number; warm: number }) {
  const hot = percentiles?.hot ?? 70;
  const warm = percentiles?.warm ?? 50;
  if (score >= hot) return { key: "hot", label: "Quente", emoji: "🔥", cls: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
  if (score >= warm) return { key: "warm", label: "Morno", emoji: "⚡", cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
  return { key: "cold", label: "Frio", emoji: "·", cls: "bg-zinc-800 text-zinc-400 border-zinc-700" };
}

export function useMatchPercentiles() {
  return useQuery({
    queryKey: ["match-percentiles"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .schema("equity_brain")
        .from("matches")
        .select("match_score")
        .eq("is_current", true)
        .order("match_score", { ascending: false })
        .limit(2000);
      const scores = ((data ?? []) as any[]).map((r) => Number(r.match_score ?? 0)).sort((a, b) => b - a);
      if (scores.length === 0) return { hot: 70, warm: 50, total: 0 };
      const p10 = scores[Math.floor(scores.length * 0.1)];
      const p30 = scores[Math.floor(scores.length * 0.3)];
      return { hot: Math.max(40, Math.round(p10)), warm: Math.max(30, Math.round(p30)), total: scores.length };
    },
    staleTime: 5 * 60 * 1000,
  });
}
