import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EntityNote, NoteEntityType } from "@/hooks/useEntityNotes";

export interface HybridSearchResult extends EntityNote {
  bm25: number;
  semantic: number;
  score: number;
  embedding_computed_at: string | null;
}

export interface NoteSearchFilters {
  entityType?: NoteEntityType | "daily" | null;
}

async function fetchQueryEmbedding(query: string): Promise<number[] | null> {
  const { data, error } = await supabase.functions.invoke("embed-query", {
    body: { query },
  });
  if (error) {
    console.error("[useNoteSearch] embed-query failed:", error);
    return null;
  }
  const vec = (data as { embedding?: number[] })?.embedding;
  if (!Array.isArray(vec)) return null;
  return vec;
}

export function useNoteSearch(query: string, filters: NoteSearchFilters = {}, opts?: { limit?: number; enabled?: boolean }) {
  const limit = opts?.limit ?? 20;
  const enabled = (opts?.enabled ?? true) && query.trim().length >= 2;

  return useQuery({
    enabled,
    queryKey: ["notes-search-hybrid", query.trim(), filters.entityType ?? null, limit],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<HybridSearchResult[]> => {
      const trimmed = query.trim();
      const embedding = await fetchQueryEmbedding(trimmed);
      const embStr = embedding ? `[${embedding.join(",")}]` : null;
      const { data, error } = await (supabase.rpc as any)("eb_notes_search_hybrid", {
        p_query: trimmed,
        p_query_embedding: embStr,
        p_entity_type: filters.entityType ?? null,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as HybridSearchResult[];
    },
  });
}
