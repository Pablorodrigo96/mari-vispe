import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MariSuggestion = {
  priority: "urgent" | "hot" | "normal";
  message: string;
  entity_type: "mandate" | "buyer";
  entity_id: string;
  cta: "whatsapp" | "view" | "task";
};

export function useMariSuggestions() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["mari-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("mari-suggest-actions");
      if (error) throw error;
      return (data?.suggestions ?? []) as MariSuggestion[];
    },
    staleTime: 5 * 60_000,
  });
  return { ...query, refresh: () => qc.invalidateQueries({ queryKey: ["mari-suggestions"] }) };
}
