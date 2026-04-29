import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MandateStatus =
  | "vigente" | "vencido" | "vendemos" | "em_negociacao" | "vendeu_sozinho" | "cancelado";

export const MANDATE_STATUS_LABELS: Record<MandateStatus, string> = {
  vigente: "Vigente",
  em_negociacao: "Em negociação",
  vendemos: "Vendemos",
  vendeu_sozinho: "Vendeu sozinho",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export const MANDATE_STATUS_COLORS: Record<MandateStatus, string> = {
  vigente: "bg-amber-500/15 text-amber-300 border-amber-700/40",
  em_negociacao: "bg-emerald-500/15 text-emerald-300 border-emerald-700/40",
  vendemos: "bg-emerald-600/20 text-emerald-200 border-emerald-600/50",
  vendeu_sozinho: "bg-orange-500/15 text-orange-300 border-orange-700/40",
  vencido: "bg-rose-500/15 text-rose-300 border-rose-700/40",
  cancelado: "bg-zinc-500/15 text-zinc-400 border-zinc-700/40",
};

export type Regiao = "sudeste" | "sul" | "centro-oeste" | "nordeste" | "norte" | "outros";

export const REGIAO_COLORS: Record<Regiao, string> = {
  sudeste: "bg-blue-500/20 text-blue-200 border-blue-700/50",
  sul: "bg-emerald-500/20 text-emerald-200 border-emerald-700/50",
  "centro-oeste": "bg-orange-500/20 text-orange-200 border-orange-700/50",
  nordeste: "bg-rose-500/20 text-rose-200 border-rose-700/50",
  norte: "bg-purple-500/20 text-purple-200 border-purple-700/50",
  outros: "bg-zinc-500/20 text-zinc-300 border-zinc-700/50",
};

export const REGIAO_LABELS: Record<Regiao, string> = {
  sudeste: "Sudeste",
  sul: "Sul",
  "centro-oeste": "Centro-Oeste",
  nordeste: "Nordeste",
  norte: "Norte",
  outros: "Outros",
};

// ---------- Hooks ----------

export function useMandates() {
  return useQuery({
    queryKey: ["crm", "mandates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_mandates_enriched" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useBuyersCrm() {
  return useQuery({
    queryKey: ["crm", "buyers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_buyers_enriched" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCrmKpis() {
  return useQuery({
    queryKey: ["crm", "kpis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_crm_kpis" as any).select("*").maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useMandate(id?: string) {
  return useQuery({
    queryKey: ["crm", "mandate", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_mandates_enriched" as any).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useBuyerCrm(id?: string) {
  return useQuery({
    queryKey: ["crm", "buyer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_buyers_enriched" as any).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useContacts(entityType: "mandate" | "buyer", entityId?: string) {
  return useQuery({
    queryKey: ["crm", "contacts", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_contacts" as any)
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("is_primary", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useActivities(entityType: "mandate" | "buyer", entityId?: string) {
  return useQuery({
    queryKey: ["crm", "activities", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_crm_activities" as any)
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useLogActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      entity_type: "mandate" | "buyer";
      entity_id: string;
      kind: string;
      direction?: "out" | "in" | "system";
      body: string;
      contact_id?: string | null;
      metadata?: any;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("eb_crm_activities" as any)
        .insert({
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          kind: input.kind,
          direction: input.direction ?? "out",
          body: input.body,
          contact_id: input.contact_id ?? null,
          metadata: input.metadata ?? {},
          created_by: u.user?.id,
        });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crm", "activities", vars.entity_type, vars.entity_id] });
    },
  });
}

export function useUpdateBuyerPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      buyer_id: string;
      ufs_interesse?: string[];
      setores_interesse?: string[];
      ticket_min?: number | null;
      ticket_max?: number | null;
      vertical_principal?: string | null;
      pause_signal?: boolean;
    }) => {
      const { buyer_id, ...patch } = input;
      const { error } = await supabase
        .from("buyers" as any).update(patch).eq("id", buyer_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crm", "buyer", vars.buyer_id] });
      qc.invalidateQueries({ queryKey: ["crm", "buyers"] });
      qc.invalidateQueries({ queryKey: ["crm", "activities", "buyer", vars.buyer_id] });
      toast.success("Preferências atualizadas. Recalculando matches...", { duration: 4000 });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar preferências"),
  });
}

export function useRematchBuyer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (buyer_id: string) => {
      const { data, error } = await supabase.functions.invoke("rematch-buyer", {
        body: { buyer_id },
      });
      if (error) throw error;
      return data as { ok: boolean; before: number; after: number };
    },
    onSuccess: (data, buyer_id) => {
      qc.invalidateQueries({ queryKey: ["crm", "buyer", buyer_id] });
      qc.invalidateQueries({ queryKey: ["crm", "matches", buyer_id] });
      toast.success(`Rematch concluído: ${data.before} → ${data.after} matches`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro no rematch"),
  });
}

export function useBuyerMatches(buyer_id?: string) {
  return useQuery({
    queryKey: ["crm", "matches", buyer_id],
    enabled: !!buyer_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches" as any)
        .select("*")
        .eq("buyer_id", buyer_id)
        .eq("is_current", true)
        .order("match_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useMandateMatches(cnpj?: string) {
  return useQuery({
    queryKey: ["crm", "mandate-matches", cnpj],
    enabled: !!cnpj,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches" as any)
        .select("*")
        .eq("cnpj", cnpj)
        .eq("is_current", true)
        .order("match_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useUpsertContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      entity_type: "mandate" | "buyer";
      entity_id: string;
      nome: string;
      cargo?: string;
      telefone_e164?: string;
      email?: string;
      is_primary?: boolean;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (input.id) {
        const { error } = await supabase
          .from("eb_contacts" as any).update(input).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("eb_contacts" as any)
          .insert({ ...input, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crm", "contacts", vars.entity_type, vars.entity_id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar contato"),
  });
}

export function ufToRegiao(uf?: string | null): Regiao {
  if (!uf) return "outros";
  const map: Record<string, Regiao> = {
    SP:"sudeste", RJ:"sudeste", MG:"sudeste", ES:"sudeste",
    PR:"sul", SC:"sul", RS:"sul",
    GO:"centro-oeste", MT:"centro-oeste", MS:"centro-oeste", DF:"centro-oeste",
    BA:"nordeste", PE:"nordeste", CE:"nordeste", MA:"nordeste", PB:"nordeste",
    RN:"nordeste", AL:"nordeste", SE:"nordeste", PI:"nordeste",
    AM:"norte", PA:"norte", AC:"norte", RO:"norte", RR:"norte", AP:"norte", TO:"norte",
  };
  return map[uf] ?? "outros";
}
