import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VerticalRegistryRow {
  slug: string;
  label: string;
  short_description: string | null;
  cnae_prefixes: string[];
  metric_1_label: string | null;
  metric_1_unit: string | null;
  metric_2_label: string | null;
  metric_2_unit: string | null;
  color: string;
  icon: string;
  source_name: string | null;
  source_url: string | null;
  market_page_path: string | null;
  active: boolean;
  position: number;
}

export function useVerticalRegistry(opts: { onlyActive?: boolean } = { onlyActive: true }) {
  return useQuery({
    queryKey: ["vertical_registry", opts.onlyActive ?? true],
    queryFn: async () => {
      let q = supabase.from("vertical_registry" as any).select("*").order("position", { ascending: true });
      if (opts.onlyActive) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as VerticalRegistryRow[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useVertical(slug: string | undefined) {
  return useQuery({
    queryKey: ["vertical_registry", "one", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vertical_registry" as any)
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as VerticalRegistryRow) ?? null;
    },
    staleTime: 5 * 60_000,
  });
}
