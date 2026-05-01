import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TodayCard {
  card_id: string;
  card_type: "hot_match" | "cooling_deal";
  priority: number;
  mandate_id: string;
  company_codename: string | null;
  company_label: string;
  setor: string | null;
  uf: string | null;
  pipeline_stage: string | null;
  temperature: string | null;
  last_activity_at: string | null;
  last_outreach_at: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  match_score: number | null;
  buyer_name: string | null;
  reason: string;
}

export function useTodayCards() {
  return useQuery({
    queryKey: ["today-cards"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("eb_today_cards");
      if (error) throw error;
      return (data ?? []) as TodayCard[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useDismissCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { mandateId: string; cardType: string; snoozeHours?: number }) => {
      const snoozeUntil = args.snoozeHours
        ? new Date(Date.now() + args.snoozeHours * 60 * 60 * 1000).toISOString()
        : null;
      const { error } = await supabase
        .schema("equity_brain" as any)
        .from("today_card_dismissals" as any)
        .insert({
          mandate_id: args.mandateId,
          card_type: args.cardType,
          snoozed_until: snoozeUntil,
        });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["today-cards"] }),
  });
}

export interface MandateSummary {
  summary_text: string;
  suggested_action_text: string | null;
  suggested_message_draft: string | null;
  suggested_contact_id: string | null;
  generated_at: string;
  expires_at: string;
  cached?: boolean;
}

export function useMandateSummary(mandateId: string | null | undefined, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["mandate-summary", mandateId],
    enabled: !!mandateId && opts?.enabled !== false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // 1. Tenta cache local na tabela
      const { data: cached } = await supabase
        .schema("equity_brain" as any)
        .from("mandate_summaries" as any)
        .select("*")
        .eq("mandate_id", mandateId)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (cached) return { ...(cached as any), cached: true } as MandateSummary;

      // 2. Gera on-demand
      const { data, error } = await supabase.functions.invoke("mari-summarize-deal", {
        body: { mandate_id: mandateId },
      });
      if (error) throw error;
      return data as MandateSummary;
    },
  });
}
