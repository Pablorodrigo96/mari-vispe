import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, ChartBar, ClipboardList, UserSearch, DollarSign,
  Briefcase, Sparkles, Shield, Plus, ArrowRight, MapPin, Users, Target,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveRoles';
import { supabase } from '@/integrations/supabase/client';

interface QuickAction {
  label: string;
  description: string;
  to: string;
  Icon: React.ComponentType<{ className?: string }>;
  primary?: boolean;
}

export default function Painel() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const eff = useEffectiveRoles();

  useEffect(() => {
    if (!loading && !user) navigate('/auth?redirect=/painel');
  }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: counts } = useQuery({
    queryKey: ['painel-counts', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [listings, valuations, capital] = await Promise.all([
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('valuation_history').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('capital_requests').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      return {
        listings: listings.count ?? 0,
        valuations: valuations.count ?? 0,
        capital: capital.count ?? 0,
      };
    },
    enabled: !!user,
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  // Build quick actions per effective persona (additive — never hide what user can do)
  const actions: QuickAction[] = [];

  // Universal
  actions.push(
    { label: 'Marketplace', description: 'Buscar empresas à venda', to: '/marketplace', Icon: Building2 },
    { label: 'Valuation', description: 'Avaliar uma empresa', to: '/valuation', Icon: ChartBar },
  );

  if (eff.isSeller || (!eff.isAdmin && !eff.isAdvisor && !eff.isFranchisee)) {
    actions.push(
      { label: 'Meus Anúncios', description: 'Gerenciar empresas anunciadas', to: '/meus-anuncios', Icon: ClipboardList, primary: true },
      { label: 'Anunciar Empresa', description: 'Cadastrar nova empresa', to: '/vender', Icon: Plus },
    );
  }
  if (eff.isBuyer) {
    actions.push(
      { label: 'Cadastrar Comprador', description: 'Receber matches automáticos', to: '/cadastrar-comprador', Icon: UserSearch, primary: true },
      { label: 'Matching', description: 'Ver oportunidades para mim', to: '/matching', Icon: Target },
    );
  }
  if (eff.isAdvisor || eff.isPartnerAccountant) {
    actions.push(
      { label: 'Potencial da Carteira', description: 'M&A oculto nos seus clientes', to: '/potencial-carteira', Icon: ChartBar, primary: true },
    );
  }
  if (eff.isPartnerAccountant) {
    actions.push(
      { label: 'Painel do Parceiro', description: 'Reservas e leads', to: '/parceiro', Icon: Briefcase },
    );
  }
  if (eff.isFranchisee) {
    actions.push(
      { label: 'Mapa de Leads', description: 'Oportunidades na minha região', to: '/mapa', Icon: MapPin, primary: true },
    );
  }
  // Capital — universal
  actions.push(
    { label: 'Captação de Capital', description: 'Solicitar funding', to: '/capital', Icon: DollarSign },
    { label: 'Minhas Captações', description: 'Acompanhar pedidos', to: '/minhas-captacoes', Icon: DollarSign },
  );
  // Admin / Equity Brain
  if (eff.isAdmin) {
    actions.push(
      { label: 'Painel Admin', description: 'Marketplace e operações', to: '/admin', Icon: Shield, primary: true },
      { label: 'Equity Brain', description: 'Cockpit M&A interno', to: '/equity-brain', Icon: Sparkles, primary: true },
    );
  }
  if (eff.isAdvisor && !eff.isAdmin) {
    actions.push(
      { label: 'Equity Brain', description: 'Cockpit M&A interno', to: '/equity-brain', Icon: Sparkles, primary: true },
    );
  }

  const greetingName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'usuário';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
          {/* Greeting */}
          <div className="mb-8">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Olá, {greetingName} 👋
              </h1>
              {eff.roles.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {eff.roles.map((r) => (
                    <Badge key={r} variant="secondary" className="text-[10px] uppercase tracking-wider">
                      {r}
                    </Badge>
                  ))}
                  {eff.isPartnerAccountant && (
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-accent/50 text-accent">
                      Parceiro Contábil
                    </Badge>
                  )}
                  {eff.isBDR && (
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-emerald-500/50 text-emerald-600">
                      BDR
                    </Badge>
                  )}
                  {eff.isHeadParcerias && (
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-blue-500/50 text-blue-600">
                      Head de Parcerias
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <p className="text-muted-foreground">
              Seu painel pessoal na PME.B3. Acesse rapidamente as ferramentas certas para o seu perfil.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Anúncios</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{counts?.listings ?? '–'}</p>
                  </div>
                  <ClipboardList className="h-8 w-8 text-accent/40" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Valuations</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{counts?.valuations ?? '–'}</p>
                  </div>
                  <ChartBar className="h-8 w-8 text-accent/40" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Captações</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{counts?.capital ?? '–'}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-accent/40" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Equity Brain Highlight (admin/advisor only) */}
          {(eff.isAdmin || eff.isAdvisor) && (
            <Card className="mb-10 border-accent/40 bg-gradient-to-br from-emerald-950/20 via-background to-background overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black">
                      EB
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        Equity Brain
                        <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-600">Interno Vispe</Badge>
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                        Cockpit M&A proprietário: 80+ buyers cadastrados, motor de scores, matching automático, board executivo.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" asChild>
                      <Link to="/equity-brain/buyers">
                        <Users className="h-4 w-4 mr-2" />Buyers
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/equity-brain/board">
                        <ChartBar className="h-4 w-4 mr-2" />Board
                      </Link>
                    </Button>
                    <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Link to="/equity-brain">
                        Abrir Cockpit <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4">Ações rápidas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {actions.map((a) => (
                <Link
                  key={a.to + a.label}
                  to={a.to}
                  className={`group rounded-xl border p-4 transition-all hover:shadow-md hover:border-accent/40 ${
                    a.primary ? 'border-accent/30 bg-accent/5' : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                      a.primary ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'
                    }`}>
                      <a.Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground text-sm">{a.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-accent transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Secondary CTA */}
          <Card className="bg-muted/30">
            <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">Quer anunciar mais uma empresa?</p>
                <p className="text-sm text-muted-foreground">Cadastro em poucos minutos, gratuito no plano básico.</p>
              </div>
              <Button asChild variant="outline">
                <Link to="/vender">Anunciar empresa <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
