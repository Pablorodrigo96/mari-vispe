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

  const incrementDCFUsage = async () => {
    if (!subscription || !user) return false;
    
    const { error } = await supabase
      .from('subscriptions')
      .update({ dcf_used: subscription.dcf_used + 1 })
      .eq('id', subscription.id);

    if (error) {
      console.error('Error incrementing DCF usage:', error);
      return false;
    }

    setSubscription(prev => prev ? { ...prev, dcf_used: prev.dcf_used + 1 } : null);
    return true;
  };

  const incrementMultiplesUsage = async () => {
    if (!subscription || !user) return false;
    
    const { error } = await supabase
      .from('subscriptions')
      .update({ multiples_used: subscription.multiples_used + 1 })
      .eq('id', subscription.id);

    if (error) {
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
