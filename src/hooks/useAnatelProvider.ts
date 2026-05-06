import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_TABLE = "acessos_banda_larga";

export interface AnatelProviderHit {
  empresa: string;
  cnpj: string;
  acessos: number;
}

export interface AnatelFootprintRow {
  cidade: string;
  estado: string;
  acessos_empresa: number;
  total_municipio: number;
  n_provedores: number;
  rank_municipio: number;
  share_pct: number | null;
}

export function useAnatelProviderSearch(q: string, table = DEFAULT_TABLE) {
  return useQuery({
    queryKey: ["anatel", "search", table, q],
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
    queryFn: async (): Promise<AnatelProviderHit[]> => {
      const { data, error } = await supabase.functions.invoke("anatel-query", {
        body: { action: "search_companies", params: { table, q, limit: 12 } },
      });
      if (error) throw error;
      return ((data as any)?.rows ?? []).map((r: any) => ({
        empresa: r.empresa,
        cnpj: String(r.cnpj ?? "").replace(/\D/g, ""),
        acessos: Number(r.acessos ?? 0),
      }));
    },
  });
}

export function useAnatelProviderFootprint(cnpj: string | null, table = DEFAULT_TABLE) {
  const clean = (cnpj ?? "").replace(/\D/g, "");
  return useQuery({
    queryKey: ["anatel", "footprint", table, clean],
    enabled: clean.length === 14,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AnatelFootprintRow[]> => {
      const { data, error } = await supabase.functions.invoke("anatel-query", {
        body: {
          action: "stats",
          params: { table, kind: "company_footprint", cnpj: clean, limit: 500 },
        },
      });
      if (error) throw error;
      return ((data as any)?.rows ?? []).map((r: any) => ({
        cidade: r.cidade,
        estado: String(r.estado ?? "").toUpperCase(),
        acessos_empresa: Number(r.acessos_empresa ?? 0),
        total_municipio: Number(r.total_municipio ?? 0),
        n_provedores: Number(r.n_provedores ?? 0),
        rank_municipio: Number(r.rank_municipio ?? 0),
        share_pct: r.share_pct == null ? null : Number(r.share_pct),
      }));
    },
  });
}
