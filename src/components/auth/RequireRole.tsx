import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";

type AppRole = "seller" | "buyer" | "advisor" | "admin" | "franchisee";

interface RequireRoleProps {
  roles: AppRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Guard genérico: bloqueia rotas a quem não tem ALGUMA das roles passadas.
 * Equivalente ao AdminRoute, mas parametrizável.
 */
export function RequireRole({ roles, children, redirectTo = "/" }: RequireRoleProps) {
  const { user, loading: authLoading } = useAuth();
  const { roles: userRoles, loading: rolesLoading } = useUserRoles();

  if (authLoading || rolesLoading) {
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
  if (!hasRole) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
