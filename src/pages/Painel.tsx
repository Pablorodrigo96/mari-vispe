import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, ChartBar, ClipboardList, UserSearch, DollarSign, Briefcase,
  Sparkles, Plus, ArrowRight, MapPin, Target, Eye, Award, Calculator,
  TrendingUp, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveRoles';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { MariWatermark } from '@/components/brand/MariLogo';
import { PageHeaderHint } from '@/components/ui/PageHeaderHint';
import { CockpitWeekStrip } from '@/components/cockpit/CockpitWeekStrip';
import { MariOriginBadge } from '@/components/painel/MariOriginBadge';
import { ExecutiveReport } from '@/components/painel/exec/ExecutiveReport';
import { buildSnapshot } from '@/lib/painelExecutive';
import { BloombergTopBar } from '@/components/painel/bbg/BloombergTopBar';
import { ColEmpresa } from '@/components/painel/bbg/ColEmpresa';
import { ColValuationBuyers } from '@/components/painel/bbg/ColValuationBuyers';
import { ColFeedAgenda } from '@/components/painel/bbg/ColFeedAgenda';
import { usePainelBloomberg } from '@/hooks/usePainelBloomberg';

interface ModuleBox {
  title: string;
  description: string;
  icon: any;
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
  tone: 'amber' | 'blue' | 'emerald' | 'violet';
}

const TONE: Record<ModuleBox['tone'], string> = {
  amber: 'from-amber-500/10 to-amber-500/0 border-amber-500/20',
  blue: 'from-blue-500/10 to-blue-500/0 border-blue-500/20',
  emerald: 'from-emerald-500/10 to-emerald-500/0 border-emerald-500/20',
  violet: 'from-violet-500/10 to-violet-500/0 border-violet-500/20',
};
const TONE_ICON: Record<ModuleBox['tone'], string> = {
  amber: 'bg-amber-500/15 text-amber-500',
  blue: 'bg-blue-500/15 text-blue-500',
  emerald: 'bg-emerald-500/15 text-emerald-500',
  violet: 'bg-violet-500/15 text-violet-500',
};

export default function Painel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const eff = useEffectiveRoles();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('full_name, company_name, phone').eq('user_id', user.id).maybeSingle();
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

  const { data: recentListings } = useQuery({
    queryKey: ['painel-recent-listings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('listings').select('id, title, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: lastValuation } = useQuery({
    queryKey: ['painel-last-valuation', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('valuation_history')
        .select('valuation_type, segment, result, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const greetingName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'usuário';
  const fullName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const snapshot = buildSnapshot(lastValuation);
  const bbg = usePainelBloomberg();

  // Onboarding progress
  const checks = [
    { label: 'Perfil completo', done: !!(profile?.full_name && profile?.phone) },
    { label: 'Primeiro anúncio', done: (counts?.listings ?? 0) > 0 },
    { label: 'Primeiro valuation', done: (counts?.valuations ?? 0) > 0 },
    { label: 'Cadastrar comprador', done: false },
  ];
  const doneCount = checks.filter(c => c.done).length;
  const progress = Math.round((doneCount / checks.length) * 100);

  const modules: ModuleBox[] = [
    {
      title: 'Marketplace & Mapa',
      description: 'Explore empresas à venda em todo o Brasil. Filtros por setor, faixa de receita e localização.',
      icon: Building2, tone: 'blue',
      primary: { label: 'Explorar marketplace', to: '/marketplace' },
      secondary: { label: 'Ver mapa', to: '/mapa' },
    },
    {
      title: 'Vender uma empresa',
      description: 'Anuncie sua empresa para milhares de investidores qualificados. Gerencie e atualize seus anúncios.',
      icon: ClipboardList, tone: 'amber',
      primary: { label: 'Anunciar empresa', to: '/vender' },
      secondary: { label: 'Meus anúncios', to: '/meus-anuncios' },
    },
    {
      title: 'Avaliar uma empresa',
      description: 'Calcule o valor de uma empresa por múltiplos, DCF, ou certifique um valuation existente.',
      icon: ChartBar, tone: 'emerald',
      primary: { label: 'Novo valuation', to: '/valuation' },
      secondary: { label: 'Meus valuations', to: '/meus-valuations' },
    },
    {
      title: 'Captar capital',
      description: 'Solicite funding para sua empresa. Conectamos com bancos, fundos e family offices.',
      icon: DollarSign, tone: 'violet',
      primary: { label: 'Solicitar capital', to: '/capital' },
      secondary: { label: 'Minhas captações', to: '/minhas-captacoes' },
    },
  ];

  const lastListingUpdate = recentListings?.[0]?.created_at ? new Date(recentListings[0].created_at) : null;

  return (
    <div className="relative -m-4 lg:-m-6 xl:-m-8">
      {/* Bloomberg top bar — full bleed */}
      <BloombergTopBar
        userName={fullName}
        roles={eff.roles}
        lastSyncMinutes={bbg.data?.lastSyncMinutes ?? null}
      />

      <div className="p-4 lg:p-6 xl:p-8 max-w-[1500px] mx-auto">
        {/* Hero / greeting (denser) */}
        <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl md:text-2xl font-bold text-foreground inline-flex items-center">
            Olá, {greetingName} 👋
            <PageHeaderHint pageKey="painel" />
          </h1>
          <div className="flex items-center gap-1.5 flex-wrap">
            {eff.isPartnerAccountant && <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-accent/50 text-accent">Parceiro Contábil</Badge>}
            {eff.isBDR && <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-emerald-500/50 text-emerald-600">BDR</Badge>}
          </div>
        </div>

        {/* Mari origin badge (se veio da calculadora pública) */}
        <div className="mb-5">
          <MariOriginBadge />
        </div>

        {/* === ABOVE THE FOLD — 3 colunas Bloomberg === */}
        <div className="grid grid-cols-1 lg:grid-cols-[24%_52%_24%] gap-4 mb-8">
          <ColEmpresa
            companyName={profile?.company_name}
            segment={lastValuation?.segment}
            score={bbg.data?.score ?? { score: 0, label: 'Cadastro inicial', breakdown: [] }}
            hasListing={(counts?.listings ?? 0) > 0}
            listingsCount={counts?.listings ?? 0}
            lastListingUpdate={lastListingUpdate}
          />
          <ColValuationBuyers snapshot={snapshot} buyersCount={bbg.data?.buyersCount && bbg.data.buyersCount > 0 ? bbg.data.buyersCount : 8} />
          <ColFeedAgenda feed={bbg.data?.feed ?? []} />
        </div>

        {/* === BELOW THE FOLD — conteúdo existente (Bloco 2 reorganiza) === */}

        {/* Executive report — Quanto vale, quanto pode valer, quando vender */}
        <ExecutiveReport snapshot={snapshot} firstName={greetingName} />

      {/* Cockpit "Sua semana na Mari" — 5 AI cards */}
      <CockpitWeekStrip />

      {/* KPIs row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPI label="Anúncios" value={counts?.listings ?? '—'} icon={ClipboardList} />
        <KPI label="Valuations" value={counts?.valuations ?? '—'} icon={ChartBar} />
        <KPI label="Captações" value={counts?.capital ?? '—'} icon={DollarSign} />
        <KPI label="Visualizações 30d" value="—" icon={Eye} hint="Em breve" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Modules grid 2x2 */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((m) => (
            <Card key={m.title} className={cn('group relative overflow-hidden border bg-gradient-to-br', TONE[m.tone])}>
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', TONE_ICON[m.tone])}>
                    <m.icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="font-semibold text-foreground text-base mb-1">{m.title}</h3>
                <p className="text-xs text-muted-foreground mb-4 flex-1">{m.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link to={m.primary.to}>{m.primary.label} <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                  </Button>
                  {m.secondary && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={m.secondary.to}>{m.secondary.label}</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Onboarding */}
          {progress < 100 && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" /> Complete seu setup
                  </h3>
                  <span className="text-xs font-mono text-muted-foreground">{progress}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                </div>
                <ul className="space-y-2">
                  {checks.map((c) => (
                    <li key={c.label} className={cn('flex items-center gap-2 text-xs', c.done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                      <span className={cn('h-3.5 w-3.5 rounded-full border flex items-center justify-center text-[8px]', c.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border')}>
                        {c.done && '✓'}
                      </span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recent activity */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-muted-foreground" /> Atividade recente
              </h3>
              {recentListings && recentListings.length > 0 ? (
                <ul className="space-y-2">
                  {recentListings.map((l: any) => (
                    <li key={l.id}>
                      <Link to={`/anuncio/${l.id}`} className="block p-2 -mx-2 rounded-md hover:bg-muted transition-colors">
                        <p className="text-xs font-medium text-foreground truncate">{l.title}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{l.status} · {new Date(l.created_at).toLocaleDateString('pt-BR')}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Sem atividade ainda. Comece anunciando uma empresa ou cadastrando-se como comprador.</p>
              )}
            </CardContent>
          </Card>

          {/* Contextual / role boxes */}
          {(eff.isAdvisor || eff.isPartnerAccountant) && (
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="p-5">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-accent" /> Para parceiros
                </h3>
                <p className="text-xs text-muted-foreground mb-3">Veja o potencial de M&A oculto na sua carteira de clientes.</p>
                <Button size="sm" variant="outline" asChild className="w-full">
                  <Link to="/potencial-carteira">Potencial da carteira <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {eff.isFranchisee && (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-5">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-500" /> Para franqueados
                </h3>
                <p className="text-xs text-muted-foreground mb-3">Oportunidades dentro da sua região no mapa.</p>
                <Button size="sm" variant="outline" asChild className="w-full">
                  <Link to="/mapa">Abrir mapa de leads <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {(eff.isAdmin || eff.isAdvisor) && (
            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-card to-card overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xs font-black">EB</div>
                  <h3 className="font-semibold text-sm text-foreground">Equity Brain</h3>
                  <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-600">Interno</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Cockpit M&A proprietário com 80+ buyers, motor de scores e board executivo.</p>
                <div className="flex gap-2">
                  <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1">
                    <Link to="/equity-brain">Abrir cockpit</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/equity-brain/board">Board</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {eff.isAdmin && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" /> Operações
                </h3>
                <Button size="sm" variant="outline" asChild className="w-full">
                  <Link to="/admin">Painel administrativo</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, hint }: { label: string; value: any; icon: any; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
            {hint && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{hint}</p>}
          </div>
          <Icon className="h-7 w-7 text-muted-foreground/30" />
        </div>
      </CardContent>
    </Card>
  );
}
