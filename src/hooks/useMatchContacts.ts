import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MatchContact {
  id?: string;
  nome: string | null;
  cargo?: string | null;
  telefone_e164: string | null;
  email: string | null;
  is_primary?: boolean | null;
  source: "contacts" | "mandate" | "buyer";
}

export interface MatchContactsBundle {
  buyer: MatchContact | null;
  buyerAll: MatchContact[];
  seller: MatchContact | null;
  sellerAll: MatchContact[];
}

/**
 * Resolve real contacts (telefone + email) for both sides of a match.
 *
 * - Buyer  → equity_brain.contacts where entity_type='buyer'  AND entity_id=buyerId
 * - Seller → equity_brain.contacts where entity_type IN ('company','cnpj') AND entity_id=cnpj
 *           fallback → equity_brain.mandates.contato_telefone/contato_email when a mandate exists.
 */
export function useMatchContacts(cnpj?: string | null, buyerId?: string | null) {
  return useQuery({
    queryKey: ["match-contacts", cnpj ?? null, buyerId ?? null],
    enabled: !!(cnpj || buyerId),
    staleTime: 60_000,
    queryFn: async (): Promise<MatchContactsBundle> => {
      const [buyerRes, sellerRes, mandateRes] = await Promise.all([
        buyerId
          ? (supabase as any)
              .schema("equity_brain")
              .from("contacts")
              .select("id,nome,cargo,telefone_e164,email,is_primary")
              .eq("entity_type", "buyer")
              .eq("entity_id", buyerId)
              .order("is_primary", { ascending: false })
              .limit(10)
          : Promise.resolve({ data: [] }),
        cnpj
          ? (supabase as any)
              .schema("equity_brain")
              .from("contacts")
              .select("id,nome,cargo,telefone_e164,email,is_primary,entity_type")
              .in("entity_type", ["company", "cnpj"])
              .eq("entity_id", cnpj)
              .order("is_primary", { ascending: false })
              .limit(10)
          : Promise.resolve({ data: [] }),
        cnpj
          ? (supabase as any)
              .schema("equity_brain")
              .from("mandates")
              .select("contato_nome,contato_telefone,contato_email")
              .eq("company_cnpj", cnpj)
              .neq("outcome", "cancelado")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const buyerAll: MatchContact[] = (buyerRes.data ?? []).map((c: any) => ({
        ...c,
        source: "contacts" as const,
      }));

      let sellerAll: MatchContact[] = (sellerRes.data ?? []).map((c: any) => ({
        ...c,
        source: "contacts" as const,
      }));

      // Fallback to mandate-level contact when no contacts row exists
      if (sellerAll.length === 0 && mandateRes?.data) {
        const m: any = mandateRes.data;
        if (m.contato_telefone || m.contato_email) {
          sellerAll = [
            {
              nome: m.contato_nome ?? null,
              telefone_e164: m.contato_telefone ?? null,
              email: m.contato_email ?? null,
              is_primary: true,
              source: "mandate",
            },
          ];
        }
      }

      return {
        buyer: buyerAll[0] ?? null,
        buyerAll,
        seller: sellerAll[0] ?? null,
        sellerAll,
      };
    },
  });
}
