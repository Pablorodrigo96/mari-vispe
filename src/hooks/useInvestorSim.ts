import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  classifyInvestor, INVESTOR_QUESTIONS, InvestorAnswer, scoreFromAnswers,
} from '@/lib/sellSimulators';

export function useInvestorAttempts(limit = 5) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['investor-sim-attempts', user?.id, limit],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investor_sim_attempts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInvestorSim() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const start = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('not authenticated');
      const { data, error } = await supabase
        .from('investor_sim_attempts')
        .insert({
          user_id: user.id,
          total_questions: INVESTOR_QUESTIONS.length,
          answers: [],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });

  const saveProgress = useMutation({
    mutationFn: async (vars: { id: string; answers: InvestorAnswer[] }) => {
      const { score, complete, partial, noinfo } = scoreFromAnswers(vars.answers);
      const { error } = await supabase
        .from('investor_sim_attempts')
        .update({
          answers: vars.answers as any,
          score,
          complete_count: complete,
          partial_count: partial,
          noinfo_count: noinfo,
        })
        .eq('id', vars.id);
      if (error) throw error;
    },
  });

  const finish = useMutation({
    mutationFn: async (vars: { id: string; answers: InvestorAnswer[]; abandoned: boolean }) => {
      const { score } = scoreFromAnswers(vars.answers);
      const score_final = vars.abandoned ? Math.floor(score * 0.7) : score;
      const klass = classifyInvestor(score_final).label;
      const { error } = await supabase
        .from('investor_sim_attempts')
        .update({
          answers: vars.answers as any,
          score,
          score_final,
          abandoned: vars.abandoned,
          completed_at: new Date().toISOString(),
          classification: klass,
        })
        .eq('id', vars.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['investor-sim-attempts'] });
      return { score, score_final };
    },
  });

  return { start, saveProgress, finish };
}
