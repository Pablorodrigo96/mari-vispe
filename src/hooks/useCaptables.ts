import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { buildSnapshot } from "@/lib/painelExecutive";

export interface Partner {
  id: string;
  captable_id: string;
  nome: string;
  documento: string | null;
  qualificacao: string | null;
  pct: number;
  source: "rfb" | "manual";
  is_pf: boolean | null;
}

export interface Captable {
  id: string;
  user_id: string;
  listing_id: string;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  valuation_amount: number | null;
  valuation_source: "valuation_history" | "listing_calc" | "manual" | null;
  valuation_at: string | null;
  available_for_sale_pct: number;
  partners: Partner[];
  listing?: { id: string; title: string; cnpj: string | null; category: string | null; annual_revenue: number | null; annual_profit: number | null };
}

export function useCaptables() {
  const { user } = useAuth();
  const [items, setItems] = useState<Captable[]>([]);
  const [eligibleListings, setEligibleListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: caps }, { data: listings }] = await Promise.all([
      (supabase as any)
        .from("company_captables")
        .select("*, listing:listings(id,title,cnpj,category,annual_revenue,annual_profit), partners:company_partners(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("listings").select("id,title,cnpj,category,annual_revenue,annual_profit").eq("user_id", user.id),
    ]);
    const used = new Set((caps ?? []).map((c: any) => c.listing_id));
    setItems((caps ?? []) as Captable[]);
    setEligibleListings((listings ?? []).filter((l: any) => !used.has(l.id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const resolveValuation = useCallback(async (listing: any) => {
    if (!user) return { amount: 0, source: "listing_calc" as const, at: new Date().toISOString() };
    const { data: vh } = await supabase
      .from("valuation_history")
      .select("result, valuation_type, segment, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    for (const row of vh ?? []) {
      const snap = buildSnapshot(row);
      if (snap?.valorAtual) return { amount: snap.valorAtual, source: "valuation_history" as const, at: row.created_at };
    }
    // Fallback: múltiplo simples 4x lucro ou 1x receita
    const lucro = Number(listing.annual_profit) || 0;
    const rev = Number(listing.annual_revenue) || 0;
    const amount = lucro > 0 ? lucro * 4 : rev * 1;
    return { amount, source: "listing_calc" as const, at: new Date().toISOString() };
  }, [user]);

  const createForListing = useCallback(async (listingId: string) => {
    if (!user) return;
    const listing = eligibleListings.find((l) => l.id === listingId);
    if (!listing) return;
    const val = await resolveValuation(listing);
    const { data: cap, error } = await (supabase as any)
      .from("company_captables")
      .insert({
        user_id: user.id,
        listing_id: listing.id,
        cnpj: listing.cnpj,
        razao_social: listing.title,
        valuation_amount: val.amount,
        valuation_source: val.source,
        valuation_at: val.at,
      })
      .select()
      .single();
    if (error) throw error;
    if (listing.cnpj) {
      await supabase.functions.invoke("captable-sync-rfb", { body: { captable_id: cap.id } }).catch(() => {});
    }
    await load();
    return cap.id as string;
  }, [user, eligibleListings, resolveValuation, load]);

  const syncRfb = useCallback(async (captableId: string) => {
    await supabase.functions.invoke("captable-sync-rfb", { body: { captable_id: captableId } });
    await load();
  }, [load]);

  const addPartner = useCallback(async (captableId: string, p: Partial<Partner>) => {
    await (supabase as any).from("company_partners").insert({
      captable_id: captableId,
      nome: p.nome || "Novo sócio",
      documento: p.documento ?? null,
      qualificacao: p.qualificacao ?? null,
      pct: p.pct ?? 0,
      source: "manual",
      is_pf: p.is_pf ?? true,
    });
    await load();
  }, [load]);

  const updatePartner = useCallback(async (id: string, patch: Partial<Partner>) => {
    await (supabase as any).from("company_partners").update(patch).eq("id", id);
    await load();
  }, [load]);

  const deletePartner = useCallback(async (id: string) => {
    await (supabase as any).from("company_partners").delete().eq("id", id);
    await load();
  }, [load]);

  const updateCaptable = useCallback(async (id: string, patch: Partial<Captable>) => {
    await (supabase as any).from("company_captables").update(patch).eq("id", id);
    await load();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await (supabase as any).from("company_captables").delete().eq("id", id);
    await load();
  }, [load]);

  return { items, eligibleListings, loading, createForListing, syncRfb, addPartner, updatePartner, deletePartner, updateCaptable, remove, reload: load };
}
