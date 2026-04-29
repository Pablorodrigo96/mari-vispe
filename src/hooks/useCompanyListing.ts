import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a public marketplace listing for a given CNPJ.
 * Used to bridge Equity Brain entities (mandates/buyers) with the
 * marketplace artifacts (Blind Teaser, VDR docs, accountant uploads).
 *
 * RLS: admins (and listing owners) can SELECT; outros usuários só veem
 * listings com status='active'. Para o EB CRM o uso primário é admin/advisor.
 */
export function useCompanyListing(cnpj?: string | null) {
  const norm = (cnpj ?? "").replace(/\D/g, "");
  return useQuery({
    queryKey: ["eb", "company-listing", norm || null],
    enabled: norm.length >= 11,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, ticker, title, codename, status, user_id, plan, cnpj")
        .eq("cnpj", norm)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.warn("[useCompanyListing]", error);
        return null;
      }
      return data;
    },
  });
}
