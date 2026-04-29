import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CrmTask = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "open" | "done" | "dismissed";
  source: "manual" | "ai";
  priority: "low" | "normal" | "high" | "urgent";
  entity_type: "mandate" | "buyer" | null;
  entity_id: string | null;
  assignee_id: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
};

export function useCrmTasks(filter?: { entity_type?: "mandate" | "buyer"; entity_id?: string }) {
  return useQuery({
    queryKey: ["eb-crm-tasks", filter],
    queryFn: async () => {
      let q = (supabase as any).schema("equity_brain").from("crm_tasks").select("*").order("created_at", { ascending: false }).limit(100);
      if (filter?.entity_type) q = q.eq("entity_type", filter.entity_type);
      if (filter?.entity_id) q = q.eq("entity_id", filter.entity_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmTask[];
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CrmTask["status"] }) => {
      const { error } = await (supabase as any).schema("equity_brain").from("crm_tasks").update({
        status,
        completed_at: status === "done" ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eb-crm-tasks"] });
      toast.success("Tarefa atualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar tarefa"),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CrmTask>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await (supabase as any).schema("equity_brain").from("crm_tasks").insert({
        ...input,
        created_by: user.id,
        assignee_id: input.assignee_id ?? user.id,
        source: input.source ?? "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eb-crm-tasks"] });
      toast.success("Tarefa criada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar tarefa"),
  });
}
