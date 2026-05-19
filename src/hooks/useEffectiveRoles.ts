import { useUserRoles } from '@/hooks/useUserRoles';
import { useViewAs } from '@/contexts/ViewAsContext';
import { usePartnerAccountant } from '@/hooks/usePartnerAccountant';

type AppRole = 'seller' | 'buyer' | 'advisor' | 'admin' | 'franchisee' | 'legal' | 'observer';

interface EffectiveRoles {
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  isBuyer: boolean;
  isAdvisor: boolean;
  isFranchisee: boolean;
  isPartnerAccountant: boolean;
  isBDR: boolean;
  isHeadParcerias: boolean;
  /** True when the user is a real admin (used to show the View-As switcher). */
  isRealAdmin: boolean;
  /** True when persona !== 'real'. */
  isViewingAs: boolean;
  /** True when persona === 'visitante' (simulate logged-out). */
  simulateLoggedOut: boolean;
}

/**
 * UI-only effective roles. RLS / route guards still use real roles.
 */
export function useEffectiveRoles(): EffectiveRoles {
  const real = useUserRoles();
  const { isPartnerAccountant: realPartner } = usePartnerAccountant();
  const { viewAs } = useViewAs();

  const isRealAdmin = real.isAdmin;

  // Non-admins can't impersonate.
  if (!isRealAdmin || viewAs === 'real') {
    return {
      roles: real.roles,
      loading: real.loading,
      isAdmin: real.isAdmin,
      isSeller: real.isSeller,
      isBuyer: real.isBuyer,
      isAdvisor: real.isAdvisor,
      isFranchisee: real.isFranchisee,
      isPartnerAccountant: realPartner,
      isBDR: false,
      isHeadParcerias: false,
      isRealAdmin,
      isViewingAs: false,
      simulateLoggedOut: false,
    };
  }

  // Admin is impersonating — derive UI roles from persona.
  let roles: AppRole[] = [];
  let isPartnerAccountant = false;
  let isBDR = false;
  let isHeadParcerias = false;
  let simulateLoggedOut = false;

  switch (viewAs) {
    case 'admin':
      roles = ['admin'];
      break;
    case 'head_parcerias':
      roles = ['admin'];
      isHeadParcerias = true;
      break;
    case 'bdr':
      roles = ['advisor'];
      isBDR = true;
      break;
    case 'parceiro':
      roles = ['advisor'];
      isPartnerAccountant = true;
      break;
    case 'franqueado':
      roles = ['franchisee'];
      break;
    case 'consultor':
      roles = ['advisor'];
      break;
    case 'seller':
      roles = ['seller'];
      break;
    case 'buyer':
      roles = ['buyer'];
      break;
    case 'visitante':
      roles = [];
      simulateLoggedOut = true;
      break;
  }

  return {
    roles,
    loading: real.loading,
    isAdmin: roles.includes('admin'),
    isSeller: roles.includes('seller'),
    isBuyer: roles.includes('buyer'),
    isAdvisor: roles.includes('advisor'),
    isFranchisee: roles.includes('franchisee'),
    isPartnerAccountant,
    isBDR,
    isHeadParcerias,
    isRealAdmin,
    isViewingAs: true,
    simulateLoggedOut,
  };
}
