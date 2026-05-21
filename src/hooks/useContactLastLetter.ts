import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContactLastLetter {
  contact_id: string;
  batch_id: string;
  sent_at: string;
  batch_status: 'generating' | 'sent' | 'failed';
  template_name: string | null;
}

/**
 * Para um conjunto de contact_ids, devolve o último lote de carta de cada um.
 * Retorna um Map<contact_id, ContactLastLetter>.
 */
export function useContactLastLetter(contactIds: string[]) {
  const sortedKey = [...contactIds].sort().join(',');
  return useQuery({
    enabled: contactIds.length > 0,
    queryKey: ['contact-last-letter', sortedKey],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('eb_contact_last_letter')
        .select('*')
        .in('contact_id', contactIds);
      if (error) throw error;
      const map = new Map<string, ContactLastLetter>();
      (data ?? []).forEach((r: ContactLastLetter) => map.set(r.contact_id, r));
      return map;
    },
    staleTime: 30_000,
  });
}
