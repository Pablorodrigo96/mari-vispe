import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ResolvedCompany = {
  cnpj: string | null;
  codename: string | null;
  razao_social: string | null;
  listing_id: string | null;
  source: "cnpj" | "codename" | "listing_uuid" | "ticker" | "not_found";
};

const isCnpj = (s: string) => /^\d{14}$/.test(s.replace(/\D/g, "")) && s.replace(/\D/g, "").length === 14;
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const isCodename = (s: string) => /^MARI-/i.test(s);

/**
 * Resolve any identifier (cnpj | codename | listing UUID | listing ticker)
 * to the canonical CNPJ used across the Equity Brain.
 */
export function useCompanyResolver(idOrCode?: string | null) {
  return useQuery({
    queryKey: ["eb-company-resolver", idOrCode ?? null],
    enabled: !!idOrCode,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ResolvedCompany> => {
      const raw = String(idOrCode ?? "").trim();
      if (!raw) return { cnpj: null, codename: null, razao_social: null, listing_id: null, source: "not_found" };

      // 1) Plain CNPJ
      if (isCnpj(raw)) {
        const cnpj = raw.replace(/\D/g, "");
        const { data } = await (supabase as any)
          .schema("equity_brain")
          .from("companies")
          .select("cnpj,codename,razao_social,listing_id")
          .eq("cnpj", cnpj)
          .maybeSingle();
        return {
          cnpj,
          codename: data?.codename ?? null,
          razao_social: data?.razao_social ?? null,
          listing_id: data?.listing_id ?? null,
          source: "cnpj",
        };
      }

      // 2) Codename MARI-XXX-####
      if (isCodename(raw)) {
        const { data } = await (supabase as any)
          .schema("equity_brain")
          .from("companies")
          .select("cnpj,codename,razao_social,listing_id")
          .eq("codename", raw)
          .maybeSingle();
        if (data?.cnpj) {
          return { ...data, source: "codename" };
        }
      }

      // 3) UUID — likely a listing_id
      if (isUuid(raw)) {
        const { data: comp } = await (supabase as any)
          .schema("equity_brain")
          .from("companies")
          .select("cnpj,codename,razao_social,listing_id")
          .eq("listing_id", raw)
          .maybeSingle();
        if (comp?.cnpj) return { ...comp, source: "listing_uuid" };

        const { data: lst } = await supabase
          .from("listings")
          .select("id,cnpj,codename,title")
          .eq("id", raw)
          .maybeSingle();
        if (lst?.cnpj) {
          return {
            cnpj: lst.cnpj,
            codename: lst.codename ?? null,
            razao_social: lst.title ?? null,
            listing_id: lst.id,
            source: "listing_uuid",
          };
        }
      }

      // 4) Ticker (e.g. VL60xxxx) — try public.listings.ticker
      const { data: byTicker } = await supabase
        .from("listings")
        .select("id,cnpj,codename,title,ticker")
        .eq("ticker", raw)
        .maybeSingle();
      if (byTicker?.cnpj) {
        return {
          cnpj: byTicker.cnpj,
          codename: byTicker.codename ?? null,
          razao_social: byTicker.title ?? null,
          listing_id: byTicker.id,
          source: "ticker",
        };
      }

      return { cnpj: null, codename: null, razao_social: raw, listing_id: null, source: "not_found" };
    },
  });
}
