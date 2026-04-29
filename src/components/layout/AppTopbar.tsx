import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, ChevronRight, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { ViewAsSwitcher } from '@/components/layout/ViewAsSwitcher';
import { useEffectiveRoles } from '@/hooks/useEffectiveRoles';
import { MariLogo } from '@/components/brand/MariLogo';

const ROUTE_LABELS: Record<string, string> = {
  '/painel': 'Painel',
  '/marketplace': 'Marketplace',
  '/mapa': 'Mapa de oportunidades',
  '/vender': 'Anunciar empresa',
  '/sell': 'Anunciar empresa',
  '/meus-anuncios': 'Meus anúncios',
  '/meu-perfil': 'Meu perfil',
  '/meus-valuations': 'Meus valuations',
  '/valuation': 'Valuation',
  '/valuation/multiplos': 'Valuation por múltiplos',
  '/valuation/dcf': 'Valuation DCF',
  '/valuation/certificador': 'Certificador de valuation',
  '/capital': 'Capital',
  '/minhas-captacoes': 'Minhas captações',
  '/cadastrar-comprador': 'Cadastrar comprador',
  '/matching': 'Matching',
  '/matching/resultados': 'Resultados de matching',
  '/potencial-carteira': 'Potencial da carteira',
  '/parceiro': 'Painel do parceiro',
  '/investors': 'Investidores',
  '/anuncio': 'Detalhe do anúncio',
  '/teaser': 'Blind teaser',
};

interface Props { onMenuClick?: () => void; }

export function AppTopbar({ onMenuClick }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const eff = useEffectiveRoles();

  const label =
    ROUTE_LABELS[location.pathname] ??
    Object.entries(ROUTE_LABELS).find(([k]) => location.pathname.startsWith(k + '/'))?.[1] ??
    'Plataforma';

  // Show back arrow whenever we're not on the dashboard root
  const canGoBack = location.pathname !== '/painel';

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/85 backdrop-blur-lg">
      <div className="h-full px-3 lg:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden h-8 w-8 shrink-0"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </Button>

          {canGoBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/painel'))}
              className="h-8 w-8 shrink-0"
              aria-label="Voltar"
              title="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <nav className="flex items-center gap-1.5 text-sm min-w-0">
            <Link to="/painel" className="text-muted-foreground hover:text-foreground hidden sm:inline shrink-0 lowercase">
              mari
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 hidden sm:inline shrink-0" />
            <span className="font-semibold text-foreground truncate">{label}</span>
          </nav>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground w-56 lg:w-64">
            <Search className="h-3.5 w-3.5" />
            <span>Buscar empresas, anúncios…</span>
          </div>
          {eff.isRealAdmin && <ViewAsSwitcher />}
          <NotificationDropdown />
        </div>
      </div>
    </header>
  );
}
