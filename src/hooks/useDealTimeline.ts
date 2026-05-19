import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DealTimelineEntry {
  id: string;
  deal_id: string | null;
  source: "audit" | "pipeline";
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  actor_user_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

/**
 * Lê a timeline unificada de um deal (audit_events + transições de pipeline).
 * View `deal_timeline` aplica RLS do chamador.
 */
export function useDealTimeline(dealId?: string | null, limit = 100) {
  return useQuery({
    queryKey: ["deal-timeline", dealId, limit],
    enabled: !!dealId,
    queryFn: async (): Promise<DealTimelineEntry[]> => {
      const { data, error } = await supabase
        .from("deal_timeline" as never)
        .select("*")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as unknown as DealTimelineEntry[];
    },
  });
}
