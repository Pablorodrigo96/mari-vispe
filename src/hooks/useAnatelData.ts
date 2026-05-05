import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AnatelAction = "schema" | "sample" | "by_cnpj" | "by_uf" | "by_municipio" | "stats";

export function useAnatelSchema(enabled = true) {
  return useQuery({
    queryKey: ["anatel", "schema", "public"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("anatel-query", {
        body: { action: "schema", params: { schema: "public" } },
      });
      if (error) throw error;
      return data as { tables: any[]; columns: any[] };
    },
  });
}

export function useAnatelByCnpj(cnpj: string | null | undefined, table: string | null, opts?: { cnpj_column?: string }) {
  const clean = (cnpj ?? "").replace(/\D/g, "");
  return useQuery({
    queryKey: ["anatel", "by_cnpj", table, clean],
    enabled: !!table && clean.length === 14,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("anatel-query", {
        body: { action: "by_cnpj", params: { table, cnpj: clean, cnpj_column: opts?.cnpj_column } },
      });
      if (error) throw error;
      return data as { rows: any[]; cnpj_column: string };
    },
  });
}

export function useCrossRefRfbAnatel(cnpj: string | null | undefined, anatelTable: string | null, cnpjColumn?: string) {
  const clean = (cnpj ?? "").replace(/\D/g, "");
  return useQuery({
    queryKey: ["crossref", "rfb-anatel", clean, anatelTable, cnpjColumn],
    enabled: clean.length === 14 && !!anatelTable,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("crossref-rfb-anatel", {
        body: { cnpj: clean, anatel_table: anatelTable, anatel_cnpj_column: cnpjColumn },
      });
      if (error) throw error;
      return data;
    },
  });
}
