import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/services/audit/auditService";

export interface StageTask {
  id: string;
  deal_id: string;
  stage_key: string;
  template_code: string;
  label: string;
  is_required: boolean;
  is_blocking: boolean;
  status: "pending" | "done" | "skipped" | "na";
  done_at: string | null;
  done_by: string | null;
  due_at: string | null;
  note: string | null;
}

export function useStageTasks(dealId?: string | null, stageKey?: string | null) {
  return useQuery({
    queryKey: ["stage-tasks", dealId, stageKey],
    enabled: !!dealId,
    queryFn: async (): Promise<StageTask[]> => {
      let q = supabase
        .from("stage_tasks" as never)
        .select("*")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: true });
      if (stageKey) q = q.eq("stage_key", stageKey);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as StageTask[];
    },
  });
}

export function useToggleStageTask(dealId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task, status }: { task: StageTask; status: StageTask["status"] }) => {
      const { data: u } = await supabase.auth.getUser();
      const patch: Record<string, unknown> = {
        status,
        done_at: status === "done" ? new Date().toISOString() : null,
        done_by: status === "done" ? u.user?.id ?? null : null,
      };
      const { error } = await supabase
        .from("stage_tasks" as never)
        .update(patch as never)
        .eq("id", task.id);
      if (error) throw error;
      logAuditEvent({
        dealId: task.deal_id,
        entityType: "pipeline",
        entityId: task.deal_id,
        eventType: status === "done" ? "task_completed" : "task_reopened",
        payload: { template_code: task.template_code, stage_key: task.stage_key, status },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stage-tasks", dealId] });
      qc.invalidateQueries({ queryKey: ["deal-stage-progress", dealId] });
    },
  });
}

export interface DealStageProgress {
  deal_id: string;
  stage_key: string;
  total: number;
  done: number;
  pending_blocking: number;
  pct_done: number;
}

export function useDealStageProgress(dealId?: string | null) {
  return useQuery({
    queryKey: ["deal-stage-progress", dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<DealStageProgress[]> => {
      const { data, error } = await supabase
        .from("deal_stage_progress" as never)
        .select("*")
        .eq("deal_id", dealId!);
      if (error) throw error;
      return (data ?? []) as unknown as DealStageProgress[];
    },
  });
}

export async function canAdvanceStage(dealId: string, fromStage: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_advance_stage" as never, {
    _deal_id: dealId,
    _from_stage: fromStage,
  } as never);
  if (error) {
    console.warn("[can_advance_stage]", error.message);
    return true; // fail-open
  }
  return (data as unknown as boolean) ?? true;
}
