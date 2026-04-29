import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MatchInboxRow } from "@/hooks/useMatchInbox";

/**
 * Fetch a single match by id and enrich with company / buyer / mandate info,
 * mirroring the shape used by the Match Inbox.
 */
export function useMatchById(matchId?: string | null) {
  return useQuery({
    queryKey: ["match-by-id", matchId ?? null],
    enabled: !!matchId,
    staleTime: 60_000,
    queryFn: async (): Promise<MatchInboxRow | null> => {
      const { data: m, error } = await (supabase as any)
        .schema("equity_brain")
        .from("matches")
        .select(
          "id,cnpj,buyer_id,match_score,thesis_key,status,setor_fit,geografia_fit,porte_fit,tese_fit,computed_at"
        )
        .eq("id", matchId)
        .maybeSingle();
      if (error) throw error;
      if (!m) return null;

      const [companyR, buyerR, mandateR] = await Promise.all([
        (supabase as any)
          .schema("equity_brain")
          .from("companies")
          .select("cnpj,razao_social,codename,uf,setor_ma,faturamento_estimado,has_listing,listing_id")
          .eq("cnpj", m.cnpj)
          .maybeSingle(),
        (supabase as any)
          .schema("equity_brain")
          .from("buyers")
          .select("id,nome,tipo,ufs_interesse,setores_interesse,ticket_min,ticket_max")
          .eq("id", m.buyer_id)
          .maybeSingle(),
        (supabase as any)
          .schema("equity_brain")
          .from("mandates")
          .select("id,outcome")
          .eq("company_cnpj", m.cnpj)
          .neq("outcome", "cancelado")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const c: any = companyR.data ?? {};
      const b: any = buyerR.data ?? {};
      const md: any = mandateR.data ?? {};

      return {
        id: m.id,
        cnpj: m.cnpj,
        buyer_id: m.buyer_id,
        match_score: Number(m.match_score ?? 0),
        thesis_key: m.thesis_key,
        status: m.status,
        setor_fit: m.setor_fit,
        geografia_fit: m.geografia_fit,
        porte_fit: m.porte_fit,
        tese_fit: m.tese_fit,
        computed_at: m.computed_at,
        razao_social: c.razao_social ?? null,
        codename: c.codename ?? null,
        uf: c.uf ?? null,
        setor_ma: c.setor_ma ?? null,
        faturamento_estimado: c.faturamento_estimado ?? null,
        has_listing: c.has_listing ?? null,
        listing_id: c.listing_id ?? null,
        buyer_nome: b.nome ?? null,
        buyer_tipo: b.tipo ?? null,
        buyer_ufs: b.ufs_interesse ?? null,
        buyer_setores: b.setores_interesse ?? null,
        ticket_min: b.ticket_min ?? null,
        ticket_max: b.ticket_max ?? null,
        mandate_id: md.id ?? null,
        mandate_outcome: md.outcome ?? null,
      };
    },
  });
}
