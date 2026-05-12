import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MandatePin } from "@/components/equity-brain/MandateMap";

export function useMandatePins() {
  return useQuery({
    queryKey: ["eb", "mandate-pins"],
    queryFn: async (): Promise<MandatePin[]> => {
      const { data, error } = await (supabase as any)
        .from("eb_v_mandate_pins")
        .select("id,fase,status,company_cnpj,razao_social,municipio,uf,latitude,longitude")
        .limit(2000);
      if (error) {
        console.warn("[useMandatePins] view error, fallback empty", error);
        return [];
      }
      return (data ?? [])
        .map((m: any) => ({
          id: m.id,
          fase: m.fase ?? null,
          company_cnpj: m.company_cnpj,
          razao_social: m.razao_social,
          municipio: m.municipio,
          uf: m.uf,
          faturamento_estimado: null,
          latitude: Number(m.latitude),
          longitude: Number(m.longitude),
        }))
        .filter(
          (m: MandatePin) =>
            Number.isFinite(m.latitude) &&
            Number.isFinite(m.longitude) &&
            Math.abs(m.latitude) <= 90 &&
            Math.abs(m.longitude) <= 180,
        );
    },
    staleTime: 5 * 60 * 1000,
  });
}
