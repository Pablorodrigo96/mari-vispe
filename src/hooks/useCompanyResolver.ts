import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CompanyCandidate = {
  cnpj: string;
  codename: string | null;
  razao_social: string | null;
};

export type ResolvedCompany = {
  cnpj: string | null;
  codename: string | null;
  razao_social: string | null;
  listing_id: string | null;
  source: "cnpj" | "codename" | "listing_uuid" | "ticker" | "synthetic" | "uuid_partial" | "fuzzy" | "not_found";
  candidates?: CompanyCandidate[];
};

const isCnpjDigits = (s: string) => /^\d{14}$/.test(s.replace(/\D/g, "")) && s.replace(/\D/g, "").length === 14;
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const isCodename = (s: string) => /^MARI-/i.test(s);

/**
 * Resolve any identifier (cnpj | codename | synthetic LST... | listing UUID | VL-prefixed ticker | fuzzy)
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

      const eb = (supabase as any).schema("equity_brain");

      // 1) Plain digits CNPJ
      if (isCnpjDigits(raw)) {
        const cnpj = raw.replace(/\D/g, "");
        const { data } = await eb
          .from("companies")
          .select("cnpj,codename,razao_social,listing_id")
          .eq("cnpj", cnpj)
          .maybeSingle();
        if (data?.cnpj) return { ...data, source: "cnpj" };
        return { cnpj, codename: null, razao_social: null, listing_id: null, source: "cnpj" };
      }

      // 2) Codename MARI-XXX-####
      if (isCodename(raw)) {
        const { data } = await eb
          .from("companies")
          .select("cnpj,codename,razao_social,listing_id")
          .eq("codename", raw)
          .maybeSingle();
        if (data?.cnpj) return { ...data, source: "codename" };
      }

      // 3) Direct lookup by cnpj column (covers synthetic e.g. LST55316249134)
      {
        const { data } = await eb
          .from("companies")
          .select("cnpj,codename,razao_social,listing_id")
          .eq("cnpj", raw)
          .maybeSingle();
        if (data?.cnpj) return { ...data, source: "synthetic" };
      }

      // 4) Full UUID — likely listing_id
      if (isUuid(raw)) {
        const { data: comp } = await eb
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

      // 5) VL-prefixed or 2-letter-prefixed hex slice (e.g. VL60b55c58449f → listing.id starts with 60b55c58-449f...)
      const hexMatch = raw.match(/^[A-Z]{2}([0-9a-f]{8,12})/i);
      if (hexMatch) {
        const hex = hexMatch[1].toLowerCase();
        // Try to find listing where id begins with first 8 chars (UUID first segment)
        const prefix = hex.slice(0, 8);
        const { data: lst } = await supabase
          .from("listings")
          .select("id,cnpj,codename,title")
          .ilike("id", `${prefix}%`)
          .maybeSingle();
        if (lst?.cnpj) {
          // Try to enrich via companies
          const { data: comp } = await eb
            .from("companies")
            .select("cnpj,codename,razao_social,listing_id")
            .eq("listing_id", lst.id)
            .maybeSingle();
          if (comp?.cnpj) return { ...comp, source: "uuid_partial" };
          return {
            cnpj: lst.cnpj,
            codename: lst.codename ?? null,
            razao_social: lst.title ?? null,
            listing_id: lst.id,
            source: "uuid_partial",
          };
        }
      }

      // 6) Ticker (exact)
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

      // 7) Fuzzy fallback — return up to 3 candidates so the UI can offer "did you mean?"
      const candidates: CompanyCandidate[] = [];
      try {
        const { data: byCode } = await eb
          .from("companies")
          .select("cnpj,codename,razao_social")
          .ilike("codename", `%${raw}%`)
          .limit(3);
        if (byCode) candidates.push(...byCode);
      } catch {}
      try {
        const { data: byName } = await eb
          .from("companies")
          .select("cnpj,codename,razao_social")
          .ilike("razao_social", `%${raw}%`)
          .limit(3);
        if (byName) {
          for (const c of byName) {
            if (!candidates.some((x) => x.cnpj === c.cnpj)) candidates.push(c);
          }
        }
      } catch {}

      return {
        cnpj: null,
        codename: null,
        razao_social: raw,
        listing_id: null,
        source: "not_found",
        candidates: candidates.slice(0, 3),
      };
    },
  });
}
