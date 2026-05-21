import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DealPairStatus = "draft" | "active" | "nbo" | "signed" | "closed" | "lost";

export interface DealPair {
  id: string;
  sell_mandate_id: string;
  buy_mandate_id: string | null;
  buyer_profile_id: string | null;
  source_match_id: string | null;
  status: DealPairStatus;
  responsavel_advisor_id: string;
  comissao_sell_pct: number;
  comissao_buy_pct: number;
  data_pareamento: string;
  lost_reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // enriched
  sell_cnpj?: string | null;
  sell_setor?: string | null;
  sell_uf?: string | null;
  sell_stage?: string | null;
  buy_cnpj?: string | null;
  buy_setor?: string | null;
  buy_uf?: string | null;
  buyer_profile_name?: string | null;
  buyer_profile_company?: string | null;
  responsavel_name?: string | null;
}

interface ListFilters {
  status?: DealPairStatus | "all";
  onlyMine?: boolean;
  userId?: string;
}

export function useDealPairs(filters: ListFilters = {}) {
  return useQuery({
    queryKey: ["deal_pairs", filters],
    queryFn: async () => {
      let q = supabase
        .from("deal_pairs_enriched" as any)
        .select("*")
        .order("updated_at", { ascending: false });
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.onlyMine && filters.userId) q = q.eq("responsavel_advisor_id", filters.userId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DealPair[];
    },
  });
}

export function useDealPair(id: string | undefined) {
  return useQuery({
    queryKey: ["deal_pair", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_pairs_enriched" as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as DealPair | null;
    },
  });
}

interface CreatePairArgs {
  sell_mandate_id: string;
  buy_mandate_id?: string | null;
  buyer_profile_id?: string | null;
  source_match_id?: string | null;
  comissao_sell?: number;
  comissao_buy?: number;
  notes?: string | null;
}

export function useCreateDealPair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: CreatePairArgs) => {
      const { data, error } = await supabase.rpc("create_deal_pair_from_match" as any, {
        _sell_mandate_id: args.sell_mandate_id,
        _buy_mandate_id: args.buy_mandate_id ?? null,
        _buyer_profile_id: args.buyer_profile_id ?? null,
        _source_match_id: args.source_match_id ?? null,
        _comissao_sell: args.comissao_sell ?? 5,
        _comissao_buy: args.comissao_buy ?? 0,
        _notes: args.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal_pairs"] });
      toast.success("Par criado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar par"),
  });
}

export function useTransitionDealPair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { pair_id: string; new_status: DealPairStatus; reason?: string }) => {
      const { error } = await supabase.rpc("transition_deal_pair" as any, {
        _pair_id: args.pair_id,
        _new_status: args.new_status,
        _reason: args.reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["deal_pairs"] });
      qc.invalidateQueries({ queryKey: ["deal_pair", vars.pair_id] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar status"),
  });
}

export const PAIR_STATUS_LABEL: Record<DealPairStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  nbo: "NBO",
  signed: "Assinado",
  closed: "Fechado",
  lost: "Perdido",
};

export const PAIR_STATUS_COLOR: Record<DealPairStatus, string> = {
  draft: "bg-zinc-700 text-zinc-200",
  active: "bg-blue-600 text-white",
  nbo: "bg-amber-600 text-white",
  signed: "bg-emerald-600 text-white",
  closed: "bg-emerald-800 text-emerald-100",
  lost: "bg-red-700 text-white",
};
