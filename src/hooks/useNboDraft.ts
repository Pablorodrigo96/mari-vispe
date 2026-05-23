import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NboDraft {
  id: string;
  deal_pair_id: string;
  template_code: string;
  current_step: number;
  payload: Record<string, any>;
  last_saved_at: string;
}

export function useNboDraft(pairId: string | undefined, templateCode = "legal_nbo_v1") {
  return useQuery({
    queryKey: ["nbo_draft", pairId, templateCode],
    enabled: !!pairId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nbo_drafts" as any)
        .select("*")
        .eq("deal_pair_id", pairId!)
        .eq("template_code", templateCode)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as NboDraft) || null;
    },
  });
}

export function useSaveNboDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      deal_pair_id: string;
      template_code?: string;
      current_step: number;
      payload: Record<string, any>;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("nbo_drafts" as any)
        .upsert(
          {
            deal_pair_id: args.deal_pair_id,
            template_code: args.template_code ?? "legal_nbo_v1",
            current_step: args.current_step,
            payload: args.payload,
            created_by: u.user?.id ?? null,
          },
          { onConflict: "deal_pair_id,template_code" },
        );
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["nbo_draft", v.deal_pair_id] });
    },
  });
}

/** Auto-save with debounce */
export function useNboAutoSave(
  pairId: string | undefined,
  step: number,
  payload: Record<string, any>,
  enabled: boolean,
) {
  const save = useSaveNboDraft();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  useEffect(() => {
    if (!enabled || !pairId) return;
    const t = setTimeout(() => {
      save.mutate(
        { deal_pair_id: pairId, current_step: step, payload },
        { onSuccess: () => setSavedAt(new Date()) },
      );
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairId, step, JSON.stringify(payload), enabled]);
  return { savedAt, isSaving: save.isPending };
}

export function useGenerateNboFromDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      deal_pair_id: string;
      custom_fields: Record<string, any>;
      template_code?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("mari-generate-document", {
        body: {
          deal_pair_id: args.deal_pair_id,
          template_code: args.template_code ?? "legal_nbo_v1",
          custom_fields: args.custom_fields,
          use_self_critique: true,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { ok: true; document: any; critique?: any };
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["legal-documents"] });
      qc.invalidateQueries({ queryKey: ["deal_pair", v.deal_pair_id] });
      toast.success("NBO gerado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao gerar NBO"),
  });
}
