import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EntityNote } from "@/hooks/useEntityNotes";

export interface SimilarNote extends EntityNote {
  similarity: number;
  embedding_computed_at: string | null;
}

export function useNotesSimilar(noteId: string | null | undefined, opts?: { limit?: number; minSimilarity?: number }) {
  const limit = opts?.limit ?? 5;
  const minSimilarity = opts?.minSimilarity ?? 0.55;
  return useQuery({
    enabled: !!noteId,
    queryKey: ["notes-similar", noteId, limit, minSimilarity],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SimilarNote[]> => {
      const { data, error } = await (supabase.rpc as any)("eb_notes_similar", {
        p_note_id: noteId,
        p_limit: limit,
        p_min_similarity: minSimilarity,
      });
      if (error) throw error;
      return (data ?? []) as SimilarNote[];
    },
  });
}
