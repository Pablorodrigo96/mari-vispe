import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

type AppRole = 'seller' | 'buyer' | 'advisor' | 'admin' | 'franchisee' | 'legal' | 'observer';

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
      return (data?.map((r) => r.role) || []) as AppRole[];
    },
    enabled: !!user,
  });

  const isAdmin = roles.includes('admin');
  const isSeller = roles.includes('seller');
  const isBuyer = roles.includes('buyer');
  const isAdvisor = roles.includes('advisor');
  const isFranchisee = roles.includes('franchisee');
  const isLegal = roles.includes('legal');
  const isObserver = roles.includes('observer');

  // Convenience: can edit EB content (docs/tasks/stage moves)
  const canEditEB = isAdmin || isAdvisor || isLegal;
  // Read-only role on EB
  const isReadOnly = isObserver && !isAdmin && !isAdvisor && !isLegal;

  return {
    roles,
    loading,
    isAdmin,
    isSeller,
    isBuyer,
    isAdvisor,
    isFranchisee,
    isLegal,
    isObserver,
    canEditEB,
    isReadOnly,
  };
}
