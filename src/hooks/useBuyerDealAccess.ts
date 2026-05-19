import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BuyerDealAccessRow {
  id: string;
  deal_id: string;
  buyer_user_id: string;
  access_level: "teaser" | "full";
  granted_by: string | null;
  granted_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  note: string | null;
}

export function useBuyerDealAccessList(dealId?: string) {
  return useQuery({
    queryKey: ["buyer_deal_access", dealId ?? "_"],
    enabled: !!dealId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buyer_deal_access" as any)
        .select("*")
        .eq("deal_id", dealId!)
        .order("granted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BuyerDealAccessRow[];
    },
  });
}

export function useGrantBuyerAccess(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      buyerUserId: string;
      accessLevel?: "teaser" | "full";
      note?: string;
    }) => {
      const { data, error } = await supabase
        .from("buyer_deal_access" as any)
        .upsert(
          {
            deal_id: dealId,
            buyer_user_id: args.buyerUserId,
            access_level: args.accessLevel ?? "teaser",
            note: args.note ?? null,
            revoked_at: null,
            revoked_by: null,
          },
          { onConflict: "deal_id,buyer_user_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as unknown as BuyerDealAccessRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buyer_deal_access", dealId] });
    },
  });
}

export function useRevokeBuyerAccess(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accessId: string) => {
      const { error } = await supabase
        .from("buyer_deal_access" as any)
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", accessId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buyer_deal_access", dealId] });
    },
  });
}

export interface BuyerDealRoomRow {
  deal_id: string;
  cnpj: string;
  stage: string;
  outcome: string;
  deal_created_at: string;
  deal_last_moved_at: string;
  buyer_user_id: string;
  access_level: "teaser" | "full";
  granted_at: string;
  nda_signed: boolean;
  can_view_identity: boolean;
}

export function useMyDealRooms() {
  return useQuery({
    queryKey: ["buyer_deal_room", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buyer_deal_room" as any)
        .select("*")
        .order("granted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BuyerDealRoomRow[];
    },
  });
}

export function useDealRoom(dealId?: string) {
  return useQuery({
    queryKey: ["buyer_deal_room", dealId ?? "_"],
    enabled: !!dealId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buyer_deal_room" as any)
        .select("*")
        .eq("deal_id", dealId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as BuyerDealRoomRow | null;
    },
  });
}
