import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MariLeadRow {
  id: string;
  user_id: string;
  cnpj: string;
  razao_social: string | null;
  uf: string | null;
  cidade: string | null;
  cnae: string | null;
  porte: string | null;
  window_base: number | null;
  listing_id: string | null;
  status: string;
  created_at: string;
}

/** Lead mais recente do usuário (até 30 dias) — pra badge no /painel. */
export function useMyMariLead() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mari-lead-self", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MariLeadRow | null> => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("mari_leads")
        .select("*")
        .eq("user_id", user!.id)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("useMyMariLead error", error);
        return null;
      }
      return (data as MariLeadRow) ?? null;
    },
  });
}

/** Leads recentes (7d) pra advisor/admin no /equity-brain/hoje. */
export function useRecentMariLeads(limit = 5) {
  return useQuery({
    queryKey: ["mari-leads-recent", limit],
    queryFn: async (): Promise<MariLeadRow[]> => {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("mari_leads")
        .select("*")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        console.error("useRecentMariLeads error", error);
        return [];
      }
      return (data as MariLeadRow[]) ?? [];
    },
    staleTime: 60_000,
  });
}
