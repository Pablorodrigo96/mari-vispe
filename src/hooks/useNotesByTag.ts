import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EntityNote } from "./useEntityNotes";

export function useNotesByTag(tag: string, includeDescendants = true, limit = 50) {
  return useQuery({
    enabled: !!tag,
    queryKey: ["eb-notes-by-tag", tag, includeDescendants, limit],
    queryFn: async (): Promise<EntityNote[]> => {
      const { data, error } = await supabase.rpc("eb_notes_by_tag" as any, {
        p_tag: tag,
        p_include_descendants: includeDescendants,
        p_limit: limit,
      });
      if (error) throw error;
      return (data as unknown as EntityNote[]) ?? [];
    },
  });
}
