import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PipelineStage = {
  id: string;
  key: string;
  label: string;
  color: string;
  position: number;
  sla_days: number;
  is_terminal: boolean;
  archived_at: string | null;
};

export const STAGE_COLOR_CLASSES: Record<string, string> = {
  blue: "border-blue-500/40 bg-blue-500/5",
  cyan: "border-cyan-500/40 bg-cyan-500/5",
  amber: "border-amber-500/40 bg-amber-500/5",
  purple: "border-purple-500/40 bg-purple-500/5",
  orange: "border-orange-500/40 bg-orange-500/5",
  emerald: "border-emerald-500/40 bg-emerald-500/5",
  rose: "border-rose-500/40 bg-rose-500/5",
  zinc: "border-zinc-500/40 bg-zinc-500/5",
  teal: "border-teal-500/40 bg-teal-500/5",
  indigo: "border-indigo-500/40 bg-indigo-500/5",
};

export const STAGE_COLOR_OPTIONS = Object.keys(STAGE_COLOR_CLASSES);

export function usePipelineStages() {
  return useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_pipeline_stages" as any)
        .select("*")
        .is("archived_at", null)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PipelineStage[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertPipelineStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<PipelineStage> & { key: string; label: string }) => {
      if (s.id) {
        const { error } = await supabase
          .from("eb_pipeline_stages" as any)
          .update({
            label: s.label,
            color: s.color,
            position: s.position,
            sla_days: s.sla_days,
            is_terminal: s.is_terminal,
          })
          .eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("eb_pipeline_stages" as any)
          .insert({
            key: s.key,
            label: s.label,
            color: s.color ?? "zinc",
            position: s.position ?? 999,
            sla_days: s.sla_days ?? 14,
            is_terminal: s.is_terminal ?? false,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-stages"] });
      qc.invalidateQueries({ queryKey: ["pipeline-kanban"] });
      toast.success("Etapa salva");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar etapa"),
  });
}

export function useArchivePipelineStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, migrateToKey, currentKey }: { id: string; migrateToKey?: string; currentKey: string }) => {
      if (migrateToKey) {
        const { error: mErr } = await supabase
          .schema("equity_brain")
          .from("mandates" as any)
          .update({ pipeline_stage: migrateToKey })
          .eq("pipeline_stage", currentKey);
        if (mErr) throw mErr;
      }
      const { error } = await supabase
        .from("eb_pipeline_stages" as any)
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-stages"] });
      qc.invalidateQueries({ queryKey: ["pipeline-kanban"] });
      toast.success("Etapa arquivada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao arquivar"),
  });
}

export function useReorderPipelineStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          supabase.from("eb_pipeline_stages" as any).update({ position: idx + 1 }).eq("id", id),
        ),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-stages"] });
    },
  });
}
