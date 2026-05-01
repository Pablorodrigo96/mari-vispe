import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TodayCard {
  card_kind: "hot_match" | "cooling_deal";
  ref_id: string;
  mandate_id: string;
  mandate_codename: string | null;
  mandate_value: number | null;
  priority_score: number | null;
  match_score: number | null;
  contact_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  days_inactive: number | null;
  headline: string;
  subline: string;
  computed_at: string | null;
}

export function useTodayCards(limit = 7) {
  return useQuery({
    queryKey: ["today-cards", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("eb_today_cards", { p_limit: limit });
      if (error) throw error;
      return (data ?? []) as unknown as TodayCard[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useDismissCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { refId: string; cardKind: string; snoozeHours?: number }) => {
      const resurfaceAt = args.snoozeHours
        ? new Date(Date.now() + args.snoozeHours * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await (supabase as any)
        .schema("equity_brain")
        .from("today_card_dismissals")
        .insert({
          ref_id: args.refId,
          card_kind: args.cardKind,
          resurface_at: resurfaceAt,
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
      const { data: cached } = await (supabase as any)
        .schema("equity_brain")
        .from("mandate_summaries")
        .select("*")
        .eq("mandate_id", mandateId)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (cached) return { ...cached, cached: true } as MandateSummary;

      const { data, error } = await supabase.functions.invoke("mari-summarize-deal", {
        body: { mandate_id: mandateId },
      });
      if (error) throw error;
      return data as MandateSummary;
    },
  });
}
