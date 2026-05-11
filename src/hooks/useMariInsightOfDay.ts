import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MariInsightRow {
  id: string;
  insight_type: string;
  priority: number;
  message: string;
  suggested_action: string | null;
  action_payload: any;
  mandate_id: string | null;
  status: string | null;
  created_at: string;
}

/**
 * Fetch Mari insights generated on a specific day (YYYY-MM-DD).
 * Used by the diary's 6th zone — "Insight da Mari do dia".
 * Returns up to 3 by priority desc.
 */
export function useMariInsightOfDay(dateStr: string) {
  return useQuery({
    queryKey: ["mari-insight-of-day", dateStr],
    queryFn: async () => {
      const start = `${dateStr}T00:00:00.000Z`;
      const end = `${dateStr}T23:59:59.999Z`;
      const { data, error } = await supabase
        .from("mari_insights" as any)
        .select("id, insight_type, priority, message, suggested_action, action_payload, mandate_id, status, created_at")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("priority", { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data ?? []) as unknown as MariInsightRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
