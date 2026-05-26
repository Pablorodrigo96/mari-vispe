import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface PlanoPerfeitoRow {
  id: string;
  user_id: string;
  valuation_inputs: unknown;
  plano_inputs: unknown;
  result: unknown;
  valuation_atual: number | null;
  valuation_meta: number | null;
  investimento_mensal: number | null;
  viabilidade: 'green' | 'yellow' | 'red' | null;
  created_at: string;
}

export function usePlanosPerfeitos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['planos-perfeitos', user?.id],
    queryFn: async (): Promise<PlanoPerfeitoRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('planos_perfeitos' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('planos_perfeitos fetch error', error);
        return [];
      }
      return (data ?? []) as unknown as PlanoPerfeitoRow[];
    },
    enabled: !!user,
  });
}
