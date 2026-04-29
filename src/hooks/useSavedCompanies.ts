import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useIsSaved(cnpj?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["eb-saved", user?.id ?? null, cnpj ?? null],
    enabled: !!user && !!cnpj,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .schema("equity_brain")
        .from("saved_companies")
        .select("id")
        .eq("user_id", user!.id)
        .eq("cnpj", cnpj)
        .maybeSingle();
      return !!data;
    },
    staleTime: 30_000,
  });
}

export function useToggleSaved(cnpj?: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (currentlySaved: boolean) => {
      if (!user || !cnpj) throw new Error("not-authenticated");
      if (currentlySaved) {
        const { error } = await (supabase as any)
          .schema("equity_brain")
          .from("saved_companies")
          .delete()
          .eq("user_id", user.id)
          .eq("cnpj", cnpj);
        if (error) throw error;
        return false;
      } else {
        const { error } = await (supabase as any)
          .schema("equity_brain")
          .from("saved_companies")
          .insert({ user_id: user.id, cnpj });
        if (error) throw error;
        return true;
      }
    },
    onSuccess: (nowSaved) => {
      qc.invalidateQueries({ queryKey: ["eb-saved", user?.id ?? null, cnpj ?? null] });
      toast.success(nowSaved ? "Empresa salva na sua lista" : "Removida da sua lista");
    },
    onError: (e: any) => {
      toast.error("Falha ao salvar", { description: e?.message ?? "Erro" });
    },
  });
}
