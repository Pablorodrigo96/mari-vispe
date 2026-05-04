import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface CockpitContext {
  primaryListing: {
    id: string;
    title: string | null;
    category: string | null;
    state: string | null;
    annual_revenue: number | null;
    equity_score: number | null;
  } | null;
  lastValuation: {
    id: string;
    valuation_type: string | null;
    segment: string | null;
    result: any;
    created_at: string;
  } | null;
  preferredSector: string | null;
  preferredState: string | null;
}

export function useCockpitData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["cockpit-context", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CockpitContext> => {
      if (!user) {
        return { primaryListing: null, lastValuation: null, preferredSector: null, preferredState: null };
      }

      const [{ data: listingRow }, { data: valuationRow }] = await Promise.all([
        supabase
          .from("listings")
          .select("id, title, category, state, annual_revenue, equity_score")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("valuation_history")
          .select("id, valuation_type, segment, result, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const sector = listingRow?.category ?? valuationRow?.segment ?? null;
      const state = listingRow?.state ?? null;

      return {
        primaryListing: listingRow ?? null,
        lastValuation: valuationRow ?? null,
        preferredSector: sector,
        preferredState: state,
      };
    },
  });
}
