import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TopTagRow {
  tag: string;
  count: number;
}

/**
 * Fetch top tags by usage in the last `days` days.
 * scope='mine' filters by current author. scope='all' returns global top.
 */
export function useTopTags(scope: "mine" | "all" = "mine", days = 30, limit = 20) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user || scope === "all",
    queryKey: ["eb-top-tags", scope, user?.id ?? "all", days, limit],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<TopTagRow[]> => {
      const { data, error } = await supabase.rpc("eb_top_tags" as any, {
        p_author: scope === "mine" ? user?.id ?? null : null,
        p_days: days,
        p_limit: limit,
      });
      if (error) throw error;
      return ((data as any[]) ?? []).map((r) => ({ tag: r.tag, count: Number(r.count) }));
    },
  });
}
