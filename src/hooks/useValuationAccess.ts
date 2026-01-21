import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
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

  // Check if user has Master plan
  const isMasterPlan = subscription?.plan === 'master';
  const planName = isMasterPlan ? 'Master' : 'Básico';

  // Get remaining credits from subscription
  const remainingMultiplesFromPlan = () => {
    if (!subscription) return 0;
    if (isMasterPlan) {
      return Math.max(0, (subscription.multiples_limit || 5) - (subscription.multiples_used || 0));
    }
    // Free plan: 1 multiple
    return Math.max(0, (subscription.multiples_limit || 1) - (subscription.multiples_used || 0));
  };

  const remainingDCFFromPlan = () => {
    if (!subscription) return 0;
    if (isMasterPlan) {
      return Math.max(0, (subscription.dcf_limit || 3) - (subscription.dcf_used || 0));
    }
    // Free plan: no DCF
    return 0;
  };

  // Check for available purchases
  const hasAvailableMultiplesPurchase = () => {
    return purchases.some(p => p.type === 'multiples' && !p.used_at);
  };

  const hasAvailableDCFPurchase = () => {
    return purchases.some(p => p.type === 'dcf' && !p.used_at);
  };

  // Total remaining (plan + purchases)
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

  // Can use valuation? (Admin tem acesso ilimitado)
  const canUseMultiples = () => isAdmin || remainingMultiples() > 0;
  const canUseDCF = () => isAdmin || remainingDCF() > 0;

  // Consume access (prefer plan credits first, then purchases)
  // Admin não consome créditos
  const consumeMultiplesAccess = async (): Promise<boolean> => {
    if (isAdmin) return true; // Admin bypass
    if (!user || !subscription) return false;
    // First try to use plan credits
    if (remainingMultiplesFromPlan() > 0) {
      const { error } = await supabase
        .from('subscriptions')
        .update({ multiples_used: (subscription.multiples_used || 0) + 1 })
        .eq('id', subscription.id);

      if (error) {
        console.error('Error incrementing multiples usage:', error);
        return false;
      }
      return true;
    }

    // Then try to use a purchase
    const availablePurchase = purchases.find(p => p.type === 'multiples' && !p.used_at);
    if (availablePurchase) {
      const { error } = await supabase
        .from('valuation_purchases')
        .update({ used_at: new Date().toISOString() })
        .eq('id', availablePurchase.id);

      if (error) {
        console.error('Error marking purchase as used:', error);
        return false;
      }
      return true;
    }

    return false;
  };

  const consumeDCFAccess = async (): Promise<boolean> => {
    if (isAdmin) return true; // Admin bypass
    if (!user || !subscription) return false;
    // First try to use plan credits
    if (remainingDCFFromPlan() > 0) {
      const { error } = await supabase
        .from('subscriptions')
        .update({ dcf_used: (subscription.dcf_used || 0) + 1 })
        .eq('id', subscription.id);

      if (error) {
        console.error('Error incrementing DCF usage:', error);
        return false;
      }
      return true;
    }

    // Then try to use a purchase
    const availablePurchase = purchases.find(p => p.type === 'dcf' && !p.used_at);
    if (availablePurchase) {
      const { error } = await supabase
        .from('valuation_purchases')
        .update({ used_at: new Date().toISOString() })
        .eq('id', availablePurchase.id);

      if (error) {
        console.error('Error marking purchase as used:', error);
        return false;
      }
      return true;
    }

    return false;
  };

  return {
    loading,
    // Admin status
    isAdmin,
    // Plan info
    planName,
    isMasterPlan,
    subscription,
    // Access checks
    canUseMultiples,
    canUseDCF,
    // Remaining counts
    remainingMultiples,
    remainingDCF,
    remainingMultiplesFromPlan,
    remainingDCFFromPlan,
    // Purchase checks
    hasAvailableMultiplesPurchase,
    hasAvailableDCFPurchase,
    purchases,
    // Consume access
    consumeMultiplesAccess,
    consumeDCFAccess,
    // Prices
    prices: VALUATION_PRICES,
  };
}
