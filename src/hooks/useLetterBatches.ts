import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LetterBatch {
  id: string;
  advisor_id: string;
  template_id: string | null;
  total_contacts: number;
  pdf_storage_path: string | null;
  csv_storage_path: string | null;
  status: 'generating' | 'sent' | 'failed';
  grafica_email: string | null;
  email_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export function useLetterBatches() {
  return useQuery({
    queryKey: ['letter-batches'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('letter_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as LetterBatch[];
    },
  });
}

export function useSendLettersBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactIds, templateId }: { contactIds: string[]; templateId: string }) => {
      const { data, error } = await supabase.functions.invoke('send-letters-batch', {
        body: { contact_ids: contactIds, template_id: templateId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { batch_id: string; pdf_url: string; csv_url: string; email_sent: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['letter-batches'] });
      qc.invalidateQueries({ queryKey: ['prospect-contacts'] });
    },
  });
}

export async function getSignedLetterUrl(path: string, expiresIn = 60 * 60 * 24 * 7) {
  const { data, error } = await supabase.storage.from('prospect-letters').createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
