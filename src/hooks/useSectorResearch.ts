import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SectorResearchRow {
  id: string;
  setor_slug: string;
  setor_nome_completo: string;
  periodo_referencia: string | null;
  data_geracao: string;
  expires_at: string;
  payload_json: SectorPayload;
  fontes_primarias: string[];
  geracao_status: "success" | "partial" | "failed";
  geracao_erro: string | null;
  custo_geracao_usd: number;
  tokens_usados: number;
  refresh_count: number;
  updated_at: string;
}

export interface SectorPayload {
  setor: string;
  periodo_referencia?: string;
  data_geracao?: string;
  fontes_primarias?: string[];
  painel_1_ranking?: any;
  painel_2_eficiencia?: any;
  painel_3_velocidade?: any;
  painel_4_head_to_head?: any;
  painel_5_mna?: any;
  conclusao_setorial?: any;
  limitacoes?: string[];
}

async function fetchCached(slug: string): Promise<SectorResearchRow | null> {
  const { data, error } = await (supabase as any)
    .schema("equity_brain")
    .from("sector_research")
    .select("*")
    .eq("setor_slug", slug)
    .maybeSingle();
  if (error) {
    console.warn("[useSectorResearch] fetch cache failed", error);
    return null;
  }
  return data as SectorResearchRow | null;
}

export function useSectorResearch(setorSlug: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["sector-research", setorSlug],
    queryFn: () => fetchCached(setorSlug),
    staleTime: 60 * 60 * 1000,
    enabled: !!setorSlug,
  });

  const isExpired = query.data
    ? new Date(query.data.expires_at).getTime() < Date.now()
    : false;

  const generate = useMutation<any, Error, boolean | undefined>({
    mutationFn: async (force?: boolean) => {
      const { data, error } = await supabase.functions.invoke("research-sector", {
        body: { setor_slug: setorSlug, force_refresh: force },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sector-research", setorSlug] });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isExpired,
    isMissing: !query.isLoading && !query.data,
    generate: generate.mutate,
    generateAsync: generate.mutateAsync,
    isGenerating: generate.isPending,
    generateError: generate.error,
  };
}
