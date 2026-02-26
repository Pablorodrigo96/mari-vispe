import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

type AppRole = 'seller' | 'buyer' | 'advisor' | 'admin' | 'franchisee';

export function useUserRoles() {
  const { user } = useAuth();

  const { data: roles = [], isLoading: loading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return (data?.map(r => r.role) || []) as AppRole[];
    },
    enabled: !!user,
  });

  const isAdmin = roles.includes('admin');
  const isSeller = roles.includes('seller');
  const isBuyer = roles.includes('buyer');
  const isAdvisor = roles.includes('advisor');
  const isFranchisee = roles.includes('franchisee');

  return {
    roles,
    loading,
    isAdmin,
    isSeller,
    isBuyer,
    isAdvisor,
    isFranchisee,
  };
}
