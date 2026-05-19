import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TriPosturaItem {
  id: string;
  counterparty_name: string; // codinome ou nome real (já filtrado por RLS)
  counterparty_id?: string;
  score: number | null;
  reason: string | null;
  link?: string;
}

interface TriPosturaResult {
  sell: TriPosturaItem[]; // compradores compatíveis
  buy: TriPosturaItem[]; // alvos compatíveis (se esta empresa também for buyer)
  partner: TriPosturaItem[]; // sinergias setoriais
}

/**
 * Carrega as 3 posturas (vendedor/comprador/parceiro) para uma empresa
 * a partir das views públicas do Equity Brain (sem rodar engine novo).
 * - sell: matches existentes com cnpj=X (top buyers)
 * - buy: matches onde buyer_id = buyer_record(cnpj) — só preenche se a empresa
 *   estiver cadastrada como buyer ativo
 * - partner: empresas no mesmo setor_ma + UF distinta (sugestão de sinergia)
 */
export function useTriPostura(cnpj: string | null | undefined) {
  return useQuery({
    queryKey: ["eb", "tri-postura", cnpj],
    enabled: !!cnpj && cnpj.length === 14,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TriPosturaResult> => {
      // ===== SELL =====
      const sellQ = await (supabase as any)
        .from("eb_matches")
        .select("id, buyer_id, match_score, reasons")
        .eq("cnpj", cnpj)
        .eq("is_current", true)
        .order("match_score", { ascending: false })
        .limit(5);

      const buyerIds = (sellQ.data ?? []).map((m: any) => m.buyer_id).filter(Boolean);
      const buyersMap = new Map<string, string>();
      if (buyerIds.length) {
        const { data: bs } = await (supabase as any)
          .from("eb_buyers")
          .select("id, nome")
          .in("id", buyerIds);
        (bs ?? []).forEach((b: any) => buyersMap.set(b.id, b.nome ?? "Buyer"));
      }
      const sell: TriPosturaItem[] = (sellQ.data ?? []).map((m: any) => ({
        id: m.id,
        counterparty_id: m.buyer_id,
        counterparty_name: buyersMap.get(m.buyer_id) ?? "Buyer",
        score: m.match_score,
        reason: Array.isArray(m.reasons) && m.reasons[0]?.key
          ? `top fator: ${m.reasons[0].key}`
          : null,
        link: `/equity-brain/crm/buyer/${m.buyer_id}`,
      }));

      // ===== BUY (se a empresa também é buyer cadastrado) =====
      let buy: TriPosturaItem[] = [];
      const { data: buyerRec } = await (supabase as any)
        .from("eb_buyers")
        .select("id, nome")
        .eq("cnpj", cnpj)
        .maybeSingle();
      if (buyerRec?.id) {
        const { data: buyMatches } = await (supabase as any)
          .from("eb_matches")
          .select("id, cnpj, match_score, reasons")
          .eq("buyer_id", buyerRec.id)
          .eq("is_current", true)
          .order("match_score", { ascending: false })
          .limit(5);
        const cnpjsList = (buyMatches ?? []).map((m: any) => m.cnpj).filter(Boolean);
        const compMap = new Map<string, { codename: string | null; razao: string | null }>();
        if (cnpjsList.length) {
          const { data: cs } = await (supabase as any)
            .from("eb_companies_blind")
            .select("cnpj, codename, razao_social")
            .in("cnpj", cnpjsList);
          (cs ?? []).forEach((c: any) =>
            compMap.set(c.cnpj, { codename: c.codename, razao: c.razao_social }),
          );
        }
        buy = (buyMatches ?? []).map((m: any) => {
          const meta = compMap.get(m.cnpj);
          return {
            id: m.id,
            counterparty_name: meta?.codename ?? meta?.razao ?? m.cnpj,
            score: m.match_score,
            reason: Array.isArray(m.reasons) && m.reasons[0]?.key
              ? `top fator: ${m.reasons[0].key}`
              : null,
            link: `/equity-brain/empresa/${m.cnpj}`,
          };
        });
      }

      // ===== PARTNER (heurística: mesmo setor, UF distinta) =====
      let partner: TriPosturaItem[] = [];
      const { data: selfRow } = await (supabase as any)
        .from("eb_companies_blind")
        .select("cnpj, setor_ma, uf")
        .eq("cnpj", cnpj)
        .maybeSingle();
      if (selfRow?.setor_ma) {
        let pq = (supabase as any)
          .from("eb_companies_blind")
          .select("cnpj, codename, razao_social, uf, faturamento_estimado")
          .eq("setor_ma", selfRow.setor_ma)
          .neq("cnpj", cnpj)
          .order("faturamento_estimado", { ascending: false, nullsFirst: false })
          .limit(8);
        if (selfRow.uf) pq = pq.neq("uf", selfRow.uf);
        const { data: peers } = await pq;
        partner = (peers ?? []).slice(0, 5).map((c: any) => ({
          id: c.cnpj,
          counterparty_name: c.codename ?? c.razao_social ?? c.cnpj,
          score: null,
          reason: `mesmo setor · ${c.uf ?? "—"}`,
          link: `/equity-brain/empresa/${c.cnpj}`,
        }));
      }

      return { sell, buy, partner };
    },
  });
}
