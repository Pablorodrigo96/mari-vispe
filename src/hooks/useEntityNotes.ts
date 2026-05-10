import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type NoteEntityType = "mandate" | "buyer_ma" | "company";
export type NoteVisibility = "internal" | "public";

export interface EntityNote {
  id: string;
  entity_type: NoteEntityType;
  entity_id: string;
  author_id: string;
  title: string | null;
  body_md: string;
  visibility: NoteVisibility;
  pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

const KEY = (t: string, id: string) => ["entity-notes", t, id];

export function useEntityNotes(entityType: NoteEntityType, entityId: string | null | undefined) {
  return useQuery({
    enabled: !!entityId,
    queryKey: KEY(entityType, entityId ?? ""),
    queryFn: async (): Promise<EntityNote[]> => {
      const { data, error } = await supabase
        .from("eb_entity_notes" as any)
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EntityNote[];
    },
  });
}

export function useCreateNote(entityType: NoteEntityType, entityId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      title?: string;
      body_md: string;
      visibility?: NoteVisibility;
      pinned?: boolean;
      tags?: string[];
    }) => {
      if (!user) throw new Error("not_authenticated");
      const { data, error } = await supabase
        .from("eb_entity_notes" as any)
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          author_id: user.id,
          title: input.title ?? null,
          body_md: input.body_md,
          visibility: input.visibility ?? "internal",
          pinned: input.pinned ?? false,
          tags: input.tags ?? [],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(entityType, entityId) });
      toast({ title: "Nota criada" });
    },
    onError: (e: any) => toast({ title: "Erro ao criar nota", description: e?.message, variant: "destructive" }),
  });
}

export function useUpdateNote(entityType: NoteEntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<EntityNote> & { id: string }) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from("eb_entity_notes" as any)
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(entityType, entityId) }),
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });
}

export function useDeleteNote(entityType: NoteEntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eb_entity_notes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(entityType, entityId) });
      toast({ title: "Nota removida" });
    },
    onError: (e: any) => toast({ title: "Erro ao remover", description: e?.message, variant: "destructive" }),
  });
}
