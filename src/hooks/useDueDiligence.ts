import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DD_TOTAL_ITEMS, DDAnswers, ddClassify, ddYesCount,
} from '@/lib/sellSimulators';

export function useDDAudits(limit = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dd-audits', user?.id, limit],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('due_diligence_audits')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDDAudit(id: string | null) {
  return useQuery({
    queryKey: ['dd-audit', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('due_diligence_audits')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useDDActions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('not authenticated');
      const { data, error } = await supabase
        .from('due_diligence_audits')
        .insert({ user_id: user.id, answers: {}, total_items: DD_TOTAL_ITEMS })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (vars: { id: string; answers: DDAnswers; completed?: boolean }) => {
      const yes = ddYesCount(vars.answers);
      const pct = DD_TOTAL_ITEMS > 0 ? Math.round((yes / DD_TOTAL_ITEMS) * 100) : 0;
      const klass = ddClassify(pct).label;
      const { error } = await supabase
        .from('due_diligence_audits')
        .update({
          answers: vars.answers as any,
          yes_count: yes,
          score_pct: pct,
          classification: klass,
          completed: vars.completed ?? false,
        })
        .eq('id', vars.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['dd-audits'] });
      qc.invalidateQueries({ queryKey: ['dd-audit', vars.id] });
    },
  });

  return { create, save };
}

// Debounced autosave helper
export function useDDDebouncedSave(id: string | null, answers: DDAnswers, delay = 700) {
  const { save } = useDDActions();
  const tRef = useRef<number | null>(null);
  const firstRef = useRef(true);
  useEffect(() => {
    if (!id) return;
    if (firstRef.current) { firstRef.current = false; return; }
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => {
      save.mutate({ id, answers });
    }, delay);
    return () => { if (tRef.current) window.clearTimeout(tRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, JSON.stringify(answers)]);
}
