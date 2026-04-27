import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  ChartBar,
  Banknote,
  ArrowLeft,
  Contact,
  Sparkles,
  Brain,
  LineChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffectiveRoles } from '@/hooks/useEffectiveRoles';

const menuItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'CRM', href: '/admin/crm', icon: Contact },
  { name: 'Usuários', href: '/admin/users', icon: Users },
  { name: 'Anúncios', href: '/admin/listings', icon: Building2 },
  { name: 'Assinaturas', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Valuations', href: '/admin/valuations', icon: ChartBar },
  { name: 'Captações', href: '/admin/capital', icon: Banknote },
  { name: 'Provedores', href: '/admin/capital/providers', icon: Building2 },
  { name: 'Parcerias', href: '/admin/parcerias', icon: Users },
];

export function AdminSidebar() {
  const location = useLocation();
  const { isAdmin, isAdvisor } = useEffectiveRoles();
  const showCockpit = isAdmin || isAdvisor;

  const ebItems = [
    { name: 'Equity Brain', href: '/equity-brain', icon: Brain },
    { name: 'Board Executivo', href: '/equity-brain/board', icon: LineChart },
    { name: 'Buyers M&A', href: '/equity-brain/buyers', icon: Users },
  ];

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Voltar ao site</span>
        </Link>
        <h1 className="text-xl font-bold text-foreground mt-4">
          Painel Admin
        </h1>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/admin' && location.pathname.startsWith(item.href));
            
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {showCockpit && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2 px-4 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-emerald-500">Cockpit Interno</span>
            </div>
            <ul className="space-y-1">
              {ebItems.map((item) => {
                const isActive = location.pathname === item.href ||
                  location.pathname.startsWith(item.href + '/');
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                          : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Área restrita a administradores
        </p>
      </div>
    </aside>
  );
}
