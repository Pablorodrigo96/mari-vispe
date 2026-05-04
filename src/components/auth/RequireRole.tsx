import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { usePartnerAccountant } from "@/hooks/usePartnerAccountant";

type AppRole = "seller" | "buyer" | "advisor" | "admin" | "franchisee";

interface RequireRoleProps {
  roles: AppRole[];
  children: React.ReactNode;
  redirectTo?: string;
  /** Aceita também usuários marcados como contador parceiro (profiles.is_partner_accountant). */
  allowPartnerAccountant?: boolean;
}

/**
 * Guard genérico: bloqueia rotas a quem não tem ALGUMA das roles passadas.
 * Equivalente ao AdminRoute, mas parametrizável.
 */
export function RequireRole({ roles, children, redirectTo = "/", allowPartnerAccountant = false }: RequireRoleProps) {
  const { user, loading: authLoading } = useAuth();
  const { roles: userRoles, loading: rolesLoading } = useUserRoles();
  const { isPartnerAccountant, loading: paLoading } = usePartnerAccountant();

  if (authLoading || rolesLoading || (allowPartnerAccountant && paLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const hasRole = userRoles.some((r) => roles.includes(r));
  const ok = hasRole || (allowPartnerAccountant && isPartnerAccountant);
  if (!ok) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
