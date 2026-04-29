import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Args {
  cnpj?: string | null;
  listingId?: string | null;
  enabled?: boolean;
}

/**
 * Returns true when the current user can see the real identity of
 * a company/listing (admin, advisor, owner or active disclosure grant).
 */
export function useIdentityVisibility({ cnpj, listingId, enabled = true }: Args) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["eb", "identity-visible", cnpj ?? null, listingId ?? null, user?.id ?? null],
    enabled: !!user && enabled && (!!cnpj || !!listingId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("eb_can_view_identity", {
        p_cnpj: cnpj ?? null,
        p_listing: listingId ?? null,
      } as any);
      if (error) {
        console.warn("[useIdentityVisibility]", error);
        return false;
      }
      return data === true;
    },
    staleTime: 60_000,
  });
}
