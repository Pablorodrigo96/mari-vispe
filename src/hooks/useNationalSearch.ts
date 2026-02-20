import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NationalCompany {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cnae: string;
  category: string;
  city: string;
  state: string;
  porte: string;
  capital_social: number | null;
  location: string;
}

interface SearchOptions {
  query?: string;
  state?: string;
  category?: string;
  limit?: number;
}

export function useNationalSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<NationalCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaidPlanRequired, setIsPaidPlanRequired] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (options: SearchOptions) => {
    if (!user) {
      setError('Login necessário');
      return;
    }

    const { query, state, category, limit = 30 } = options;
    if (!query && !state && !category) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    setIsPaidPlanRequired(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('national-search', {
        body: {
          type: query ? 'search' : 'sector',
          query,
          state,
          category,
          limit,
        },
      });

      if (fnError) throw fnError;

      if (data?.code === 'PAID_PLAN_REQUIRED') {
        setIsPaidPlanRequired(true);
        setResults([]);
        return;
      }

      setResults(data?.companies || []);
    } catch (err: any) {
      const msg = err?.message || 'Erro na busca';
      if (msg.includes('PAID_PLAN_REQUIRED') || err?.context?.status === 403) {
        setIsPaidPlanRequired(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = (options: SearchOptions) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(options), 500);
  };

  const lookupCnpj = async (cnpj: string): Promise<NationalCompany & { razao_social: string } | null> => {
    if (!user) return null;
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length < 14) return null;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('national-search', {
        body: { type: 'cnpj', cnpj: clean },
      });

      if (fnError) throw fnError;
      return data?.company || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    results,
    loading,
    error,
    isPaidPlanRequired,
    search,
    debouncedSearch,
    lookupCnpj,
  };
}
