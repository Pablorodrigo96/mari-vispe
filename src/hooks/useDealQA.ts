import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveRoles } from "./useEffectiveRoles";

export interface DealQARow {
  id: string;
  deal_id: string;
  buyer_user_id: string;
  author_user_id: string;
  author_role: "buyer" | "advisor" | "admin" | "legal";
  question: string;
  answer: string | null;
  answered_at: string | null;
  answered_by: string | null;
  parent_id: string | null;
  visible_to_buyer: boolean;
  created_at: string;
  updated_at: string;
}

const KEY = (dealId: string, buyerId?: string | null) => [
  "deal_qa",
  dealId,
  buyerId ?? "_",
];

/**
 * Lista Q&A de um deal.
 * - Se buyerUserId for passado, filtra (visão advisor focada em um buyer específico).
 * - Sem filtro: comprador vê apenas o que é seu via RLS; staff vê tudo.
 */
export function useDealQA(dealId?: string, buyerUserId?: string | null) {
  return useQuery({
    queryKey: KEY(dealId ?? "_", buyerUserId),
    enabled: !!dealId,
    queryFn: async () => {
      let q = supabase
        .from("deal_qa" as any)
        .select("*")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: true });
      if (buyerUserId) q = q.eq("buyer_user_id", buyerUserId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DealQARow[];
    },
  });
}

export function useAskQuestion(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (question: string) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("not_authenticated");
      const { data, error } = await supabase
        .from("deal_qa" as any)
        .insert({
          deal_id: dealId,
          buyer_user_id: uid,
          author_user_id: uid,
          author_role: "buyer",
          question: question.trim(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DealQARow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal_qa", dealId] });
    },
  });
}

export function useAnswerQuestion(dealId: string) {
  const qc = useQueryClient();
  const roles = useEffectiveRoles();
  return useMutation({
    mutationFn: async (args: { id: string; answer: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("not_authenticated");
      const role: DealQARow["author_role"] = roles.isAdmin
        ? "admin"
        : roles.isAdvisor
        ? "advisor"
        : ((roles.roles as any[])?.includes?.("legal") ? "legal" : "advisor");
      const { error } = await supabase
        .from("deal_qa" as any)
        .update({
          answer: args.answer.trim(),
          answered_at: new Date().toISOString(),
          answered_by: uid,
        })
        .eq("id", args.id);
      if (error) throw error;
      // also log activity? deferred.
      void role;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal_qa", dealId] });
    },
  });
}

export function useStaffPostQuestion(dealId: string) {
  /** Advisor postar pergunta interna em nome do buyer (ex: importada por e-mail/whatsapp). */
  const qc = useQueryClient();
  const roles = useEffectiveRoles();
  return useMutation({
    mutationFn: async (args: {
      buyerUserId: string;
      question: string;
      visibleToBuyer?: boolean;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("not_authenticated");
      const role: DealQARow["author_role"] = roles.isAdmin
        ? "admin"
        : roles.isAdvisor
        ? "advisor"
        : "legal";
      const { data, error } = await supabase
        .from("deal_qa" as any)
        .insert({
          deal_id: dealId,
          buyer_user_id: args.buyerUserId,
          author_user_id: uid,
          author_role: role,
          question: args.question.trim(),
          visible_to_buyer: args.visibleToBuyer ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DealQARow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal_qa", dealId] });
    },
  });
}

export function useToggleQAVisibility(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; visible: boolean }) => {
      const { error } = await supabase
        .from("deal_qa" as any)
        .update({ visible_to_buyer: args.visible })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal_qa", dealId] });
    },
  });
}
