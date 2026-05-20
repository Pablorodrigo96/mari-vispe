import { Suspense, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveRoles';
import { AppShellProvider } from '@/contexts/AppShellContext';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';
import { ContentLoader } from './RouteLoader';
import { cn } from '@/lib/utils';

/**
 * Layout shell for authenticated end-user routes.
 * - Visitors → fall back to the page rendered without the shell (public layout)
 * - Logged-in users → persistent sidebar + topbar (true SaaS feel).
 */
export function AppShell() {
  const { user, loading } = useAuth();
  const eff = useEffectiveRoles();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin impersonating "visitante" → bounce to public home so they see the visitor UI.
  useEffect(() => {
    if (eff.simulateLoggedOut) navigate('/', { replace: true });
  }, [eff.simulateLoggedOut, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  // Not logged in → render the page in its public layout (no sidebar, no auth wall).
  if (!user) {
    return (
      <AppShellProvider value={{ inAppShell: false }}>
        <Suspense fallback={<ContentLoader />}>
          <Outlet />
        </Suspense>
      </AppShellProvider>
    );
  }

  return (
    <AppShellProvider value={{ inAppShell: true }}>
      <div className="min-h-screen flex bg-background">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} />
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed left-0 top-0 z-50 lg:hidden">
              <AppSidebar collapsed={false} onToggleCollapse={() => setMobileOpen(false)} />
            </div>
          </>
        )}

        <div className={cn('flex-1 min-w-0 flex flex-col')}>
          <AppTopbar onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 bg-muted/20 overflow-x-hidden">
            <Suspense fallback={<ContentLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </AppShellProvider>
  );
}
