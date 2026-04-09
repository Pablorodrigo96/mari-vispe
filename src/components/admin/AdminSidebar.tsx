import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CreditCard, 
  ChartBar,
  Banknote,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
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
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Área restrita a administradores
        </p>
      </div>
    </aside>
  );
}
