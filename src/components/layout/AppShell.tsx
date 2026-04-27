import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveRoles';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';
import { cn } from '@/lib/utils';

/**
 * Layout shell for authenticated end-user routes.
 *
 * - Visitors (no user) OR admin impersonating "visitante" -> redirected to /auth or fall through to public site.
 * - Logged-in users -> persistent sidebar + topbar (true SaaS feel).
 */
export function AppShell() {
  const { user, loading } = useAuth();
  const eff = useEffectiveRoles();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname), { replace: true });
    }
  }, [loading, user, navigate]);

  // Admin impersonating visitor -> bounce to public home so they see the visitor UI.
  useEffect(() => {
    if (eff.simulateLoggedOut) navigate('/', { replace: true });
  }, [eff.simulateLoggedOut, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 z-50 lg:hidden">
            <AppSidebar collapsed={false} onToggleCollapse={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <div className={cn('flex-1 min-w-0 flex flex-col')}>
        <AppTopbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 bg-muted/20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
