import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LetterTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  signature_html: string | null;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useLetterTemplates(includeInactive = false) {
  return useQuery({
    queryKey: ['letter-templates', includeInactive],
    queryFn: async () => {
      let q = (supabase as any).from('letter_templates').select('*').order('is_default', { ascending: false }).order('name');
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LetterTemplate[];
    },
  });
}

export function useUpsertLetterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tpl: Partial<LetterTemplate> & { name: string; body_html: string }) => {
      const payload: Record<string, unknown> = {
        name: tpl.name,
        subject: tpl.subject ?? 'Lote de cartas para impressão',
        body_html: tpl.body_html,
        signature_html: tpl.signature_html ?? null,
        is_default: tpl.is_default ?? false,
        is_active: tpl.is_active ?? true,
      };
      if (tpl.id) {
        const { data, error } = await (supabase as any)
          .from('letter_templates')
          .update(payload)
          .eq('id', tpl.id)
          .select()
          .single();
        if (error) throw error;
        return data as LetterTemplate;
      }
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from('letter_templates')
        .insert({ ...payload, created_by: userRes.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as LetterTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['letter-templates'] }),
  });
}

export function useDeleteLetterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('letter_templates').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['letter-templates'] }),
  });
}
