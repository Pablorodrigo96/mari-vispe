import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Subscription {
  id: string;
  plan: string;
  status: string;
  dcf_limit: number;
  dcf_used: number;
  multiples_limit: number;
  multiples_used: number;
  expires_at: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscription() {
      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
      }

      setSubscription(data);
      setLoading(false);
    }

    fetchSubscription();
  }, [user]);

  const isMasterPlan = subscription?.plan === 'master';

  const canUseDCF = () => {
    if (!subscription) return false;
    if (isMasterPlan) {
      return subscription.dcf_used < subscription.dcf_limit;
    }
    return false;
  };

  const canUseMultiples = () => {
    if (!subscription) return false;
    return subscription.multiples_used < subscription.multiples_limit;
  };

  const remainingDCF = () => {
    if (!subscription) return 0;
    if (isMasterPlan) {
      return Math.max(0, subscription.dcf_limit - subscription.dcf_used);
    }
    return 0;
  };

  const remainingMultiples = () => {
    if (!subscription) return 0;
    return Math.max(0, subscription.multiples_limit - subscription.multiples_used);
  };

  // Credit consumption now happens via edge function in useValuationAccess
  // These methods are kept for backward compatibility but should not be used directly
  const incrementDCFUsage = async () => {
    if (!subscription || !user) return false;
    
    const { data, error } = await supabase.functions.invoke('use-valuation-credit', {
      body: { type: 'dcf' },
    });

    if (error || !data?.success) {
      console.error('Error incrementing DCF usage:', error);
      return false;
    }

    setSubscription(prev => prev ? { ...prev, dcf_used: prev.dcf_used + 1 } : null);
    return true;
  };

  const incrementMultiplesUsage = async () => {
    if (!subscription || !user) return false;
    
    const { data, error } = await supabase.functions.invoke('use-valuation-credit', {
      body: { type: 'multiples' },
    });

    if (error || !data?.success) {
      console.error('Error incrementing multiples usage:', error);
      return false;
    }

    setSubscription(prev => prev ? { ...prev, multiples_used: prev.multiples_used + 1 } : null);
    return true;
  };

  return {
    subscription,
    loading,
    isMasterPlan,
    canUseDCF,
    canUseMultiples,
    remainingDCF,
    remainingMultiples,
    incrementDCFUsage,
    incrementMultiplesUsage,
    hasPaidPlan: isMasterPlan,
  };
}
