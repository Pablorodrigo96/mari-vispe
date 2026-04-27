import { useState, useMemo } from 'react';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { PublicFooter as Footer } from '@/components/layout/PublicFooter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Briefcase, TrendingUp, Crown, MessageCircle, Users, DollarSign, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, Tooltip } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { openWhatsApp } from '@/lib/whatsapp';

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

export default function PortfolioPotential() {
  const { user } = useAuth();

  const { data: listingsCount = 0 } = useQuery({
    queryKey: ['portfolio-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const [clients, setClients] = useState<number>(listingsCount || 5);

  // Sync when data loads
  const effectiveClients = clients || 1;

  const chartData = useMemo(() => [
    { name: 'Pessimista', value: effectiveClients * SCENARIOS.pessimistic.annualPerClient, fill: '#94a3b8' },
    { name: 'Realista', value: effectiveClients * SCENARIOS.realistic.annualPerClient, fill: '#d4a853' },
    { name: 'Otimista', value: effectiveClients * (SCENARIOS.optimistic.annualPerClient + SCENARIOS.optimistic.successFee), fill: '#eab308' },
  ], [effectiveClients]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-background via-accent/5 to-background">
        <div className="container mx-auto px-4 text-center">
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
      </section>

      <div className="container mx-auto px-4 pb-20 space-y-12">

        {/* Slider de clientes */}
        <Card className="max-w-xl mx-auto">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg flex items-center justify-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              Quantos clientes na sua carteira?
            </CardTitle>
            {listingsCount > 0 && (
              <CardDescription>Detectamos {listingsCount} empresa(s) cadastrada(s) por você</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Slider
                min={1}
                max={100}
                step={1}
                value={[clients]}
                onValueChange={([v]) => setClients(v)}
                className="flex-1"
              />
              <Input
                type="number"
                min={1}
                max={500}
                value={clients}
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
                      dataKey="value"
                      position="top"
                      formatter={(v: number) => formatBRL(v)}
                      style={{ fill: 'hsl(var(--foreground))', fontSize: 13, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Breakdown por Faixa de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Clientes</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Pessimista/ano</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Realista/ano</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Otimista/ano</th>
                  </tr>
                </thead>
                <tbody>
                  {[5, 10, 20, 50, 100].map(n => (
                    <tr key={n} className={`border-b border-border/50 ${n === effectiveClients ? 'bg-accent/5 font-semibold' : ''}`}>
                      <td className="py-3 px-4">{n} clientes</td>
                      <td className="text-right py-3 px-4">{formatBRL(n * SCENARIOS.pessimistic.annualPerClient)}</td>
                      <td className="text-right py-3 px-4 text-accent">{formatBRL(n * SCENARIOS.realistic.annualPerClient)}</td>
                      <td className="text-right py-3 px-4">{formatBRL(n * (SCENARIOS.optimistic.annualPerClient + SCENARIOS.optimistic.successFee))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Button
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold gap-2"
            onClick={() => openWhatsApp('Olá! Gostaria de saber mais sobre o potencial da minha carteira de clientes.')}
          >
            <MessageCircle className="w-5 h-5" />
            Falar com o Time Comercial
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
