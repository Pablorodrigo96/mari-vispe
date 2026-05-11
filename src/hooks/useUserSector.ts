import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Resolve o setor do usuário via RPC get_sector_for_user.
 * Fallback: 'isp-banda-larga'.
 */
export function useUserSector() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["user-sector", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_sector_for_user" as any, {});
      if (error) {
        console.warn("[useUserSector] rpc failed, fallback isp-banda-larga", error);
        return "isp-banda-larga";
      }
      return (data as string) || "isp-banda-larga";
    },
  });
  return { sectorSlug: data || "isp-banda-larga", isLoading };
}
