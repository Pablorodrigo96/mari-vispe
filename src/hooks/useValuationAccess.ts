import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface ValuationPurchase {
  id: string;
  user_id: string;
  type: 'multiples' | 'dcf';
  price_cents: number;
  stripe_payment_id: string | null;
  status: string;
  created_at: string;
  used_at: string | null;
}

export const VALUATION_PRICES = {
  multiples: 9900, // R$ 99,00
  dcf: 49000,      // R$ 490,00
};

export function useValuationAccess() {
  const { user } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const queryClient = useQueryClient();

  // Fetch available purchases (paid but not used)
  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ['valuation-purchases', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('valuation_purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching valuation purchases:', error);
        return [];
      }

      return data as ValuationPurchase[];
    },
    enabled: !!user,
  });

  const loading = subscriptionLoading || purchasesLoading || rolesLoading;

  const isMasterPlan = subscription?.plan === 'master';
  const planName = isMasterPlan ? 'Master' : 'Básico';

  const remainingMultiplesFromPlan = () => {
    if (!subscription) return 0;
    if (isMasterPlan) {
      return Math.max(0, (subscription.multiples_limit || 5) - (subscription.multiples_used || 0));
    }
    return Math.max(0, (subscription.multiples_limit || 1) - (subscription.multiples_used || 0));
  };

  const remainingDCFFromPlan = () => {
    if (!subscription) return 0;
    if (isMasterPlan) {
      return Math.max(0, (subscription.dcf_limit || 3) - (subscription.dcf_used || 0));
    }
    return 0;
  };

  const hasAvailableMultiplesPurchase = () => {
    return purchases.some(p => p.type === 'multiples' && !p.used_at);
  };

  const hasAvailableDCFPurchase = () => {
    return purchases.some(p => p.type === 'dcf' && !p.used_at);
  };

  const remainingMultiples = () => {
    const fromPlan = remainingMultiplesFromPlan();
    const fromPurchases = purchases.filter(p => p.type === 'multiples' && !p.used_at).length;
    return fromPlan + fromPurchases;
  };

  const remainingDCF = () => {
    const fromPlan = remainingDCFFromPlan();
    const fromPurchases = purchases.filter(p => p.type === 'dcf' && !p.used_at).length;
    return fromPlan + fromPurchases;
  };

  const canUseMultiples = () => isAdmin || remainingMultiples() > 0;
  const canUseDCF = () => isAdmin || remainingDCF() > 0;

  // Consume access via edge function (server-side)
  const consumeMultiplesAccess = async (): Promise<boolean> => {
    if (isAdmin) return true;
    if (!user) return false;

    const { data, error } = await supabase.functions.invoke('use-valuation-credit', {
      body: { type: 'multiples' },
    });

    if (error) {
      console.error('Error consuming multiples credit:', error);
      return false;
    }

    if (data?.success) {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['valuation-purchases', user.id] });
      return true;
    }

    return false;
  };

  const consumeDCFAccess = async (): Promise<boolean> => {
    if (isAdmin) return true;
    if (!user) return false;

    const { data, error } = await supabase.functions.invoke('use-valuation-credit', {
      body: { type: 'dcf' },
    });

    if (error) {
      console.error('Error consuming DCF credit:', error);
      return false;
    }

    if (data?.success) {
      queryClient.invalidateQueries({ queryKey: ['valuation-purchases', user.id] });
      return true;
    }

    return false;
  };

  return {
    loading,
    isAdmin,
    planName,
    isMasterPlan,
    subscription,
    canUseMultiples,
    canUseDCF,
    remainingMultiples,
    remainingDCF,
    remainingMultiplesFromPlan,
    remainingDCFFromPlan,
    hasAvailableMultiplesPurchase,
    hasAvailableDCFPurchase,
    purchases,
    consumeMultiplesAccess,
    consumeDCFAccess,
    prices: VALUATION_PRICES,
  };
}
