import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Deal = {
  id: string;
  match_id: string;
  mandate_id: string | null;
  buyer_id: string;
  cnpj: string;
  stage: string;
  outcome: string;
  owner_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_moved_at: string;
};

/** Promove um match para o pipeline (cria/recupera deal). */
export function usePromoteMatchToDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (match_id: string) => {
      const { data, error } = await (supabase as any)
        .schema("equity_brain")
        .rpc("promote_match_to_deal", { _match_id: match_id });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eb-deals"] });
      toast.success("Match promovido para o pipeline");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao promover"),
  });
}

/** Lista deals do pipeline (com nomes resolvidos). */
export function useDeals(filters: { stage?: string; outcome?: string } = {}) {
  return useQuery({
    queryKey: ["eb-deals", filters],
    queryFn: async () => {
      let q = (supabase as any).schema("equity_brain").from("deals").select("*").order("last_moved_at", { ascending: false }).limit(500);
      if (filters.stage) q = q.eq("stage", filters.stage);
      if (filters.outcome) q = q.eq("outcome", filters.outcome);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as Deal[];
      if (rows.length === 0) return [];
      const cnpjs = Array.from(new Set(rows.map((r) => r.cnpj)));
      const buyerIds = Array.from(new Set(rows.map((r) => r.buyer_id)));
      const [companiesR, buyersR] = await Promise.all([
        (supabase as any).schema("equity_brain").from("companies")
          .select("cnpj,razao_social,codename,setor_ma,uf,faturamento_estimado").in("cnpj", cnpjs),
        (supabase as any).schema("equity_brain").from("buyers")
          .select("id,nome,tipo").in("id", buyerIds),
      ]);
      const cMap = new Map((companiesR.data ?? []).map((c: any) => [c.cnpj, c]));
      const bMap = new Map((buyersR.data ?? []).map((b: any) => [b.id, b]));
      return rows.map((r) => ({
        ...r,
        company: cMap.get(r.cnpj) ?? null,
        buyer: bMap.get(r.buyer_id) ?? null,
      }));
    },
    staleTime: 30_000,
  });
}

/** Carrega 1 deal pelo id, com lados resolvidos. */
export function useDeal(id?: string) {
  return useQuery({
    queryKey: ["eb-deal", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .schema("equity_brain").from("deals").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const d = data as Deal;
      const [c, b] = await Promise.all([
        (supabase as any).schema("equity_brain").from("companies")
          .select("cnpj,razao_social,codename,setor_ma,uf,faturamento_estimado").eq("cnpj", d.cnpj).maybeSingle(),
        (supabase as any).schema("equity_brain").from("buyers")
          .select("id,nome,tipo,ufs_interesse,setores_interesse,ticket_min,ticket_max").eq("id", d.buyer_id).maybeSingle(),
      ]);
      return { ...d, company: c.data ?? null, buyer: b.data ?? null };
    },
  });
}

export function useUpdateDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage, outcome }: { id: string; stage?: string; outcome?: string }) => {
      const patch: any = {};
      if (stage) patch.stage = stage;
      if (outcome) patch.outcome = outcome;
      const { error } = await (supabase as any).schema("equity_brain").from("deals").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["eb-deals"] });
      qc.invalidateQueries({ queryKey: ["eb-deal", vars.id] });
      toast.success("Estágio atualizado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao mover"),
  });
}
