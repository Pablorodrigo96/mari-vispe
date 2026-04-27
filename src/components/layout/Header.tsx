import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Building2, LogOut, ClipboardList, User, Shield, UserSearch, DollarSign, BarChart3, Briefcase } from 'lucide-react';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useEffectiveRoles } from '@/hooks/useEffectiveRoles';
import { usePartnerAccountant } from '@/hooks/usePartnerAccountant';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ViewAsSwitcher } from '@/components/layout/ViewAsSwitcher';

const navigation = [
  { name: 'Comprar Empresa', href: '/marketplace' },
  { name: 'Mapa', href: '/mapa' },
  { name: 'Vender Empresa', href: '/vender' },
  { name: 'Valuation', href: '/valuation' },
  { name: 'Investidores', href: '/investors' },
  { name: 'Captação', href: '/capital' },
  { name: 'Matching', href: '/matching' },
];

function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return scrollY;
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin: realIsAdmin } = useUserRoles();
  const eff = useEffectiveRoles();
  const { isAdmin, isAdvisor } = eff;
  const isPartnerAccountant = eff.isPartnerAccountant;
  const scrollY = useScrollPosition();
  // Admin impersonating "visitante" sees the logged-out UI everywhere.
  const showLoggedOutUI = !user || eff.simulateLoggedOut;

  const darkHeroRoutes = ['/', '/matching', '/matching/results', '/investors', '/sell', '/valuation'];
  const hasDarkHero = darkHeroRoutes.includes(location.pathname);
  const isScrolled = scrollY > 20;
  const isTransparent = hasDarkHero && !isScrolled && !mobileMenuOpen;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isTransparent
          ? 'bg-transparent border-b border-transparent'
          : 'bg-card/80 backdrop-blur-lg border-b border-border'
      )}
    >
      <nav className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <Building2 className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className={cn('text-xl font-bold transition-colors duration-300', isTransparent ? 'text-white' : 'text-foreground')}>
              PME<span className="text-accent">.B3</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  location.pathname === item.href
                    ? 'text-accent'
                    : isTransparent
                      ? 'text-white/80 hover:text-white hover:bg-white/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex lg:items-center lg:gap-3">
            {realIsAdmin && <ViewAsSwitcher isTransparent={isTransparent} />}
            <NotificationDropdown />

            {user && !showLoggedOutUI ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={cn('gap-2', isTransparent && 'hover:bg-white/10')}>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-muted-foreground text-xs pointer-events-none">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/painel')}>
                    <Briefcase className="w-4 h-4 mr-2" />
                    Meu Painel
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="w-4 h-4 mr-2" />
                      Painel Admin
                    </DropdownMenuItem>
                  )}
                  {(isAdmin || isAdvisor) && (
                    <DropdownMenuItem onClick={() => navigate('/equity-brain')}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Equity Brain
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/meu-perfil')}>
                    <User className="w-4 h-4 mr-2" />
                    Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/meus-anuncios')}>
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Meus Anúncios
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/cadastrar-comprador')}>
                    <UserSearch className="w-4 h-4 mr-2" />
                    Cadastrar Comprador
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/minhas-captacoes')}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Minhas Captações
                  </DropdownMenuItem>
                  {(isAdvisor || isAdmin || isPartnerAccountant) && (
                    <DropdownMenuItem onClick={() => navigate('/potencial-carteira')}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Potencial da Carteira
                    </DropdownMenuItem>
                  )}
                  {isPartnerAccountant && (
                    <DropdownMenuItem onClick={() => navigate('/parceiro')}>
                      <Briefcase className="w-4 h-4 mr-2" />
                      Painel do Parceiro
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" asChild className={cn(isTransparent && 'text-white hover:bg-white/10')}>
                <Link to="/auth">Entrar</Link>
              </Button>
            )}

            {showLoggedOutUI ? (
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold" asChild>
                <Link to="/vender">Anunciar Grátis</Link>
              </Button>
            ) : (
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold" asChild>
                <Link to="/painel">Meu Painel</Link>
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn('lg:hidden', isTransparent && 'text-white hover:bg-white/10')}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    location.pathname === item.href
                      ? 'text-accent bg-accent/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 mt-2 border-t border-border flex flex-col gap-2">
                {user && !showLoggedOutUI ? (
                  <>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => { navigate('/painel'); setMobileMenuOpen(false); }}
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Meu Painel
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Painel Admin
                      </Button>
                    )}
                    {(isAdmin || isAdvisor) && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => { navigate('/equity-brain'); setMobileMenuOpen(false); }}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Equity Brain
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start" 
                      onClick={() => { navigate('/meu-perfil'); setMobileMenuOpen(false); }}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Meu Perfil
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start" 
                      onClick={() => { navigate('/meus-anuncios'); setMobileMenuOpen(false); }}
                    >
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Meus Anúncios
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start" 
                      onClick={() => { navigate('/cadastrar-comprador'); setMobileMenuOpen(false); }}
                    >
                      <UserSearch className="w-4 h-4 mr-2" />
                      Cadastrar Comprador
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start" 
                      onClick={() => { navigate('/minhas-captacoes'); setMobileMenuOpen(false); }}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Minhas Captações
                    </Button>
                    {(isAdvisor || isAdmin || isPartnerAccountant) && (
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={() => { navigate('/potencial-carteira'); setMobileMenuOpen(false); }}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Potencial da Carteira
                      </Button>
                    )}
                    {isPartnerAccountant && (
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={() => { navigate('/parceiro'); setMobileMenuOpen(false); }}
                      >
                        <Briefcase className="w-4 h-4 mr-2" />
                        Painel do Parceiro
                      </Button>
                    )}
                    <Button variant="outline" className="w-full justify-center" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" className="w-full justify-center" asChild>
                    <Link to="/auth">Entrar</Link>
                  </Button>
                )}
                {showLoggedOutUI ? (
                  <Button className="w-full justify-center bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
                    <Link to="/vender">Anunciar Grátis</Link>
                  </Button>
                ) : (
                  <Button className="w-full justify-center bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
                    <Link to="/painel">Meu Painel</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
