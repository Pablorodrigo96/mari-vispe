import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UpdatePayload {
  field: string;
  value: any;
  oldValue?: any;
}

export function useUpdateBuyer(buyerId?: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ field, value, oldValue }: UpdatePayload) => {
      if (!buyerId) throw new Error("buyerId required");

      const { error } = await (supabase as any)
        .schema("equity_brain")
        .from("buyers")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", buyerId);
      if (error) throw error;

      // Audit em crm_activities (kind='note' com metadata indicando field_update)
      try {
        await (supabase as any).schema("equity_brain").from("crm_activities").insert({
          entity_type: "buyer",
          entity_id: buyerId,
          kind: "note",
          direction: "internal",
          body: `Campo "${field}" atualizado`,
          metadata: { type: "field_update", field, old: oldValue ?? null, new: value },
          created_by: user?.id ?? null,
        });
      } catch (_) {
        // não bloqueia a edição se a auditoria falhar
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "buyer", buyerId] });
      qc.invalidateQueries({ queryKey: ["crm", "buyers"] });
      qc.invalidateQueries({ queryKey: ["activities", "buyer", buyerId] });
    },
  });
}
