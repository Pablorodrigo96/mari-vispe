import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function usePartnerAccountant() {
  const { user } = useAuth();
  const { isAdvisor, loading: rolesLoading } = useUserRoles();

  const { data: isPartnerAccountant = false, isLoading: profileLoading } = useQuery({
    queryKey: ['partner-accountant', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('profiles')
        .select('is_partner_accountant')
        .eq('user_id', user.id)
        .single();
      if (error) return false;
      return data?.is_partner_accountant ?? false;
    },
    enabled: !!user && isAdvisor,
  });

  return {
    isPartnerAccountant: isAdvisor && isPartnerAccountant,
    loading: rolesLoading || profileLoading,
  };
}
