import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, MapPin, Store, ClipboardList, Plus, Search,
  UserSearch, Target, ChartBar, FileText, Award, Calculator, DollarSign,
  Briefcase, Sparkles, Shield, Brain, ChevronDown, LogOut, User, ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { MariLogo } from '@/components/brand/MariLogo';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveRoles';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface NavChild { name: string; href: string; icon: any; }
interface NavGroup { id: string; name: string; icon: any; children: NavChild[]; }

interface Props {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapse }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const eff = useEffectiveRoles();

  const groups: NavGroup[] = [
    {
      id: 'overview', name: 'Visão Geral', icon: LayoutDashboard,
      children: [{ name: 'Painel', href: '/painel', icon: LayoutDashboard }],
    },
    {
      id: 'marketplace', name: 'Marketplace', icon: Store,
      children: [
        { name: 'Buscar empresas', href: '/marketplace', icon: Search },
        { name: 'Mapa de oportunidades', href: '/mapa', icon: MapPin },
      ],
    },
    {
      id: 'sell', name: 'Vender', icon: Building2,
      children: [
        { name: 'Meus anúncios', href: '/meus-anuncios', icon: ClipboardList },
        { name: 'Anunciar empresa', href: '/vender', icon: Plus },
      ],
    },
    {
      id: 'buy', name: 'Comprar', icon: UserSearch,
      children: [
        { name: 'Cadastrar comprador', href: '/cadastrar-comprador', icon: UserSearch },
        { name: 'Matching automático', href: '/matching', icon: Target },
        { name: 'Resultados', href: '/matching/resultados', icon: ChartBar },
      ],
    },
    {
      id: 'valuation', name: 'Valuation', icon: ChartBar,
      children: [
        { name: 'Novo valuation', href: '/valuation', icon: Plus },
        { name: 'Meus valuations', href: '/meus-valuations', icon: FileText },
        { name: 'Múltiplos', href: '/valuation/multiplos', icon: Calculator },
        { name: 'DCF', href: '/valuation/dcf', icon: ChartBar },
        { name: 'Certificador', href: '/valuation/certificador', icon: Award },
      ],
    },
    {
      id: 'capital', name: 'Capital', icon: DollarSign,
      children: [
        { name: 'Solicitar capital', href: '/capital', icon: Plus },
        { name: 'Minhas captações', href: '/minhas-captacoes', icon: DollarSign },
      ],
    },
  ];

  if (eff.isAdvisor || eff.isPartnerAccountant || eff.isFranchisee || eff.isAdmin) {
    groups.push({
      id: 'partners', name: 'Parcerias', icon: Briefcase,
      children: [
        { name: 'Painel do parceiro', href: '/parceiro', icon: Briefcase },
        { name: 'Potencial da carteira', href: '/potencial-carteira', icon: ChartBar },
        ...(eff.isAdmin
          ? [{ name: 'Head de Parcerias', href: '/admin/parcerias', icon: Shield }]
          : []),
      ],
    });
  }

  // Determine which groups should start open (the one containing active route)
  const initialOpen = groups.reduce((acc, g) => {
    acc[g.id] = g.children.some(c => location.pathname === c.href || location.pathname.startsWith(c.href + '/'));
    if (g.id === 'overview') acc[g.id] = true;
    return acc;
  }, {} as Record<string, boolean>);
  const [open, setOpen] = useState<Record<string, boolean>>(initialOpen);

  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }));

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';
  const handleSignOut = async () => { await signOut(); navigate('/'); };

  return (
    <aside
      className={cn(
        'sticky top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-200 z-30',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand */}
      <div className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0">
        <Link to="/painel" className="flex items-center min-w-0 text-foreground">
          <MariLogo size={28} showWordmark={!collapsed} />
        </Link>
        <button
          onClick={onToggleCollapse}
          className="text-muted-foreground hover:text-foreground p-1 rounded hidden lg:block"
          aria-label="Colapsar menu"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {groups.map((g) => {
          const isGroupActive = g.children.some(c => location.pathname === c.href);
          const isOpen = open[g.id] ?? false;

          if (collapsed) {
            // Collapsed: render only the group icon as a link to the first child
            return (
              <Link
                key={g.id}
                to={g.children[0].href}
                title={g.name}
                className={cn(
                  'flex items-center justify-center h-10 my-1 rounded-lg transition-colors',
                  isGroupActive ? 'bg-accent/15 text-accent' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <g.icon className="h-4 w-4" />
              </Link>
            );
          }

          return (
            <div key={g.id} className="mb-1">
              <button
                onClick={() => toggle(g.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors',
                  isGroupActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <span className="flex items-center gap-2">
                  <g.icon className="h-3.5 w-3.5" />
                  {g.name}
                </span>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <ul className="mt-0.5 ml-3 pl-3 border-l border-border space-y-0.5">
                  {g.children.map((c) => {
                    const isActive = location.pathname === c.href;
                    return (
                      <li key={c.href}>
                        <Link
                          to={c.href}
                          className={cn(
                            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                            isActive
                              ? 'bg-accent/15 text-accent font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          )}
                        >
                          <c.icon className="h-3.5 w-3.5" />
                          {c.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        {/* Cockpit Interno (admin/advisor) */}
        {(eff.isAdmin || eff.isAdvisor) && !collapsed && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-2 px-3 mb-1">
              <Sparkles className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-emerald-500">
                Cockpit Interno
              </span>
            </div>
            <ul className="space-y-0.5">
              {eff.isAdmin && (
                <li>
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </Link>
                </li>
              )}
              <li>
                <Link
                  to="/equity-brain"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-emerald-500 hover:bg-emerald-500/10"
                >
                  <Brain className="h-3.5 w-3.5" />
                  Equity Brain
                </Link>
              </li>
            </ul>
          </div>
        )}
        {(eff.isAdmin || eff.isAdvisor) && collapsed && (
          <div className="mt-3 pt-3 border-t border-border space-y-1">
            {eff.isAdmin && (
              <Link to="/admin" title="Admin" className="flex items-center justify-center h-10 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <Shield className="h-4 w-4" />
              </Link>
            )}
            <Link to="/equity-brain" title="Equity Brain" className="flex items-center justify-center h-10 rounded-lg text-emerald-500 hover:bg-emerald-500/10">
              <Brain className="h-4 w-4" />
            </Link>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3 shrink-0">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-8 w-8"><AvatarFallback className="bg-accent text-accent-foreground text-xs">{userInitials}</AvatarFallback></Avatar>
            <button onClick={handleSignOut} title="Sair" className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Link to="/meu-perfil" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8"><AvatarFallback className="bg-accent text-accent-foreground text-xs">{userInitials}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
                <p className="text-[10px] text-muted-foreground">Meu perfil</p>
              </div>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start mt-1 text-muted-foreground hover:text-destructive">
              <LogOut className="h-3.5 w-3.5 mr-2" />Sair
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}
