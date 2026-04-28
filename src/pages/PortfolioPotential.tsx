import { useState, useMemo } from 'react';
import { useInAppShell } from '@/contexts/AppShellContext';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { PublicFooter as Footer } from '@/components/layout/PublicFooter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Briefcase, TrendingUp, Crown, MessageCircle, Users, DollarSign, BarChart3,
  Trophy, ShieldCheck, Target, Flame,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, Tooltip } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { openWhatsApp } from '@/lib/whatsapp';
import { Link } from 'react-router-dom';
import { analyzePortfolio, SERVICE_META, scoreLevel, type ServiceKey } from '@/lib/portfolioPotentialScoring';

const SCENARIOS = {
  pessimistic: {
    label: 'Pessimista',
    services: 'CFO as a Service',
    monthlyPerClient: 3000,
    annualPerClient: 36000,
    successFee: 0,
    color: 'hsl(var(--muted-foreground))',
    bgClass: 'bg-muted/30 border-muted',
    icon: Briefcase,
    badge: null,
  },
  realistic: {
    label: 'Realista',
    services: 'CFO + Aceleração Comercial',
    monthlyPerClient: 7500,
    annualPerClient: 90000,
    successFee: 0,
    color: 'hsl(var(--accent))',
    bgClass: 'bg-accent/5 border-accent ring-2 ring-accent/20',
    icon: TrendingUp,
    badge: 'Recomendado',
  },
  optimistic: {
    label: 'Otimista',
    services: 'CFO + AC + M&A',
    monthlyPerClient: 15000,
    annualPerClient: 180000,
    successFee: 50000,
    color: 'hsl(45, 93%, 47%)',
    bgClass: 'bg-yellow-500/5 border-yellow-500/30',
    icon: Crown,
    badge: 'Máximo Potencial',
  },
} as const;

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

interface PortfolioListing {
  id: string;
  title: string;
  category: string | null;
  asking_price: number | null;
  annual_revenue: number | null;
  annual_profit: number | null;
  equity_score: number | null;
  vdr_readiness: number | null;
}

export default function PortfolioPotential() {
  const { user } = useAuth();
  const inShell = useInAppShell();

  // Carteira real do usuário logado
  const { data: portfolio = [] } = useQuery({
    queryKey: ['portfolio-real', user?.id],
    queryFn: async (): Promise<PortfolioListing[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from('listings')
        .select('id, title, category, asking_price, annual_revenue, annual_profit, equity_score, vdr_readiness')
        .eq('user_id', user.id)
        .order('equity_score', { ascending: false, nullsFirst: false });
      return (data ?? []) as PortfolioListing[];
    },
    enabled: !!user,
  });

  const realStats = useMemo(() => {
    const total = portfolio.length;
    const aggRevenue = portfolio.reduce((s, p) => s + (p.annual_revenue ?? 0), 0);
    const aggMnaValue = portfolio.reduce((s, p) => {
      const v = p.asking_price && p.asking_price > 0 ? p.asking_price : (p.annual_revenue ?? 0) * 1.5;
      return s + v;
    }, 0);
    const scoredCount = portfolio.filter(p => p.equity_score != null).length;
    const avgScore = scoredCount > 0
      ? Math.round(portfolio.reduce((s, p) => s + (p.equity_score ?? 0), 0) / scoredCount)
      : 0;
    const ready = portfolio.filter(p => (p.vdr_readiness ?? 0) >= 100 || (p.equity_score ?? 0) >= 70).length;
    const commission = aggMnaValue * 0.05; // 5% sobre valor potencial agregado (M&A success fee médio)
    return { total, aggRevenue, aggMnaValue, avgScore, ready, commission };
  }, [portfolio]);

  const top5 = portfolio.slice(0, 5);

  const [clients, setClients] = useState<number>(5);
  const effectiveClients = clients || 1;

  const chartData = useMemo(() => [
    { name: 'Pessimista', value: effectiveClients * SCENARIOS.pessimistic.annualPerClient, fill: '#94a3b8' },
    { name: 'Realista', value: effectiveClients * SCENARIOS.realistic.annualPerClient, fill: '#d4a853' },
    { name: 'Otimista', value: effectiveClients * (SCENARIOS.optimistic.annualPerClient + SCENARIOS.optimistic.successFee), fill: '#eab308' },
  ], [effectiveClients]);

  const content = (
    <div className={inShell ? 'p-4 lg:p-8 max-w-[1400px] mx-auto space-y-8' : 'container mx-auto px-4 pb-20 space-y-12'}>
      {/* Header (apenas modo público) */}
      {!inShell && (
        <div className="text-center pt-6">
          <Badge variant="outline" className="mb-4 border-accent text-accent">
            <BarChart3 className="w-3 h-3 mr-1" /> Simulador de Receita
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Potencial da Sua <span className="text-accent">Carteira</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Descubra quanto sua carteira de clientes pode gerar em receita recorrente com os serviços Vispe.
          </p>
        </div>
      )}

      {inShell && (
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-accent" />
            Potencial da Sua Carteira
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão real dos clientes que você cadastrou + simulador de honorários recorrentes.
          </p>
        </div>
      )}

      {/* === SEÇÃO 1: CARTEIRA REAL === */}
      {user && portfolio.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Sua carteira na PME.B3</h2>
            <Badge variant="outline" className="bg-transparent">{realStats.total} clientes ativos</Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <RealStatCard icon={<Users className="w-4 h-4" />} label="Clientes" value={String(realStats.total)} color="text-blue-400" />
            <RealStatCard icon={<DollarSign className="w-4 h-4" />} label="Receita agregada/ano" value={formatBRL(realStats.aggRevenue)} color="text-emerald-400" />
            <RealStatCard icon={<TrendingUp className="w-4 h-4" />} label="Valor M&A potencial" value={formatBRL(realStats.aggMnaValue)} color="text-accent" />
            <RealStatCard icon={<Target className="w-4 h-4" />} label="Score médio" value={`${realStats.avgScore}/100`} color="text-yellow-500" />
            <RealStatCard icon={<ShieldCheck className="w-4 h-4" />} label="Prontos para vitrine" value={String(realStats.ready)} color="text-emerald-400" />
          </div>

          <Card className="border-accent/40 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent">
            <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Comissão M&A potencial (5% sobre o valor agregado)</p>
                <p className="text-3xl font-extrabold text-accent">{formatBRL(realStats.commission)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Considerando taxa de sucesso média sobre o valor de venda potencial dos {realStats.total} clientes da sua carteira.
                </p>
              </div>
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => openWhatsApp(`Olá! Tenho ${realStats.total} clientes cadastrados na PME.B3 e quero acelerar a conversão da carteira.`)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />Falar com Head de Parcerias
              </Button>
            </CardContent>
          </Card>

          {top5.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top {top5.length} clientes da carteira por score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 px-3 font-medium">Empresa</th>
                        <th className="text-left py-2 px-3 font-medium">Categoria</th>
                        <th className="text-right py-2 px-3 font-medium">Receita</th>
                        <th className="text-right py-2 px-3 font-medium">Valor potencial</th>
                        <th className="text-center py-2 px-3 font-medium">Score</th>
                        <th className="text-center py-2 px-3 font-medium">VDR</th>
                        <th className="py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {top5.map(l => {
                        const potential = l.asking_price && l.asking_price > 0 ? l.asking_price : (l.annual_revenue ?? 0) * 1.5;
                        return (
                          <tr key={l.id} className="border-b border-border/40">
                            <td className="py-2 px-3 font-medium text-foreground truncate max-w-[200px]">{l.title}</td>
                            <td className="py-2 px-3 text-muted-foreground">{l.category ?? '—'}</td>
                            <td className="py-2 px-3 text-right">{formatBRL(l.annual_revenue ?? 0)}</td>
                            <td className="py-2 px-3 text-right text-accent font-medium">{formatBRL(potential)}</td>
                            <td className="py-2 px-3 text-center">
                              {l.equity_score != null ? (
                                <Badge className={`text-xs ${
                                  l.equity_score >= 70 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                                  l.equity_score >= 40 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                                  'bg-red-500/15 text-red-400 border-red-500/30'
                                }`}>{l.equity_score}</Badge>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="py-2 px-3 text-center text-xs text-muted-foreground">{l.vdr_readiness ?? 0}%</td>
                            <td className="py-2 px-3">
                              <Link to={`/anuncio/${l.id}`} className="text-xs text-accent hover:underline">Ver</Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* === SEÇÃO 2: SIMULADOR DE HONORÁRIOS RECORRENTES === */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Simulador de honorários recorrentes (Vispe)</h2>
        </div>

        {/* Slider */}
        <Card className="max-w-xl mx-auto">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg flex items-center justify-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              Quantos clientes na simulação?
            </CardTitle>
            {portfolio.length > 0 && (
              <CardDescription>
                Sua carteira real tem {portfolio.length} cliente(s). Ajuste abaixo para projetar cenários maiores.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Slider min={1} max={100} step={1} value={[clients]} onValueChange={([v]) => setClients(v)} className="flex-1" />
              <Input
                type="number" min={1} max={500} value={clients}
                onChange={(e) => setClients(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
              />
            </div>
          </CardContent>
        </Card>

        {/* 3 Cards de cenário */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.entries(SCENARIOS) as [string, typeof SCENARIOS[keyof typeof SCENARIOS]][]).map(([key, s]) => {
            const Icon = s.icon;
            const totalMonthly = effectiveClients * s.monthlyPerClient;
            const totalAnnual = effectiveClients * (s.annualPerClient + s.successFee);
            return (
              <Card key={key} className={`relative transition-all hover:scale-[1.02] ${s.bgClass}`}>
                {s.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                    {s.badge}
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 mb-2">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-lg">{s.label}</CardTitle>
                  <CardDescription className="text-xs">{s.services}</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Por cliente/mês</p>
                    <p className="text-xl font-bold text-foreground">{formatBRL(s.monthlyPerClient)}</p>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">Total mensal ({effectiveClients} clientes)</p>
                    <p className="text-2xl font-bold text-accent">{formatBRL(totalMonthly)}</p>
                  </div>
                  <div className="bg-accent/5 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Receita anual projetada</p>
                    <p className="text-3xl font-extrabold text-foreground">{formatBRL(totalAnnual)}</p>
                    {s.successFee > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        + {formatBRL(effectiveClients * s.successFee)} success fee estimado
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Gráfico Recharts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent" />
              Comparativo de Receita Anual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={80}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                    <LabelList
                      dataKey="value" position="top"
                      formatter={(v: number) => formatBRL(v)}
                      style={{ fill: 'hsl(var(--foreground))', fontSize: 13, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Button
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
            onClick={() => openWhatsApp('Olá! Gostaria de saber mais sobre o potencial da minha carteira de clientes.')}
          >
            <MessageCircle className="w-5 h-5" />
            Falar com o Time Comercial
          </Button>
        </div>
      </section>
    </div>
  );

  if (inShell) return content;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="pt-24 pb-4 bg-gradient-to-br from-background via-accent/5 to-background" />
      {content}
      <Footer />
    </div>
  );
}

function RealStatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className={`flex items-center gap-1.5 ${color} mb-1`}>
          {icon}
          <span className="text-[10px] uppercase tracking-wide">{label}</span>
        </div>
        <div className="text-lg font-bold text-foreground truncate">{value}</div>
      </CardContent>
    </Card>
  );
}
