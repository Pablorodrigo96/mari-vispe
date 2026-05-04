import { supabase } from "@/integrations/supabase/client";
import type { MariPrefill } from "@/lib/mariPrefill";

const cnpjDigits = (cnpj: string) => cnpj.replace(/\D/g, "");

/**
 * Insere ou atualiza o lead da Mari no signup.
 * Idempotente via UNIQUE(user_id, cnpj).
 */
export async function logMariLead(prefill: MariPrefill, userId: string): Promise<void> {
  try {
    const cnpj = cnpjDigits(prefill.cnpj);
    if (!cnpj || cnpj.length !== 14) return;
    await supabase.from("mari_leads").upsert(
      {
        user_id: userId,
        cnpj,
        razao_social: prefill.razaoSocial,
        uf: prefill.uf,
        cidade: prefill.cidade,
        cnae: prefill.cnaeSection,
        porte: prefill.porte,
        window_base: prefill.windowBase ?? null,
        status: "signup",
      },
      { onConflict: "user_id,cnpj" },
    );
  } catch (e) {
    console.error("logMariLead error", e);
  }
}

/**
 * Marca o lead como convertido (anúncio publicado).
 */
export async function logMariListing(
  prefill: MariPrefill,
  listingId: string,
  userId: string,
): Promise<void> {
  try {
    const cnpj = cnpjDigits(prefill.cnpj);
    if (!cnpj) return;
    await supabase
      .from("mari_leads")
      .update({ listing_id: listingId, status: "listed" })
      .eq("user_id", userId)
      .eq("cnpj", cnpj);
  } catch (e) {
    console.error("logMariListing error", e);
  }
}
