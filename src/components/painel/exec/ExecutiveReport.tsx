import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ValuationOnboardingDialog } from './ValuationOnboardingDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, Area, AreaChart,
} from 'recharts';
import {
  ArrowRight, Calculator, Cog, ClipboardCheck, Target, TrendingUp,
  Sparkles, Calendar, Users, ShieldCheck, Lock, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValuationSnapshot, brl, getPillars, Pillar } from '@/lib/painelExecutive';
import { getWhatsAppLink } from '@/lib/whatsapp';

const ICONS: Record<string, any> = { Cog, ClipboardCheck, Target, TrendingUp };

export function ExecutiveReport({ snapshot, firstName }: { snapshot: ValuationSnapshot | null; firstName: string }) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (!snapshot) {
    return (
      <>
      <Card className="mb-6 relative overflow-hidden border-2 border-accent/40 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent shadow-2xl">
        {/* radial glow */}
        <div
          className="pointer-events-none absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)' }}
        />
        {/* deco icon */}
        <Calculator className="pointer-events-none absolute right-6 bottom-6 h-40 w-40 text-accent/10 hidden md:block" strokeWidth={1} />

        <CardContent className="relative p-8 md:p-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 mb-5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-accent">Comece por aqui · Passo 1</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight mb-4 leading-[1.1]">
              Quanto vale sua empresa <span className="text-accent">hoje?</span>
            </h2>

            <p className="text-base md:text-lg text-muted-foreground mb-7 leading-relaxed">
              Para mostrar quanto você pode ganhar nos próximos anos, a Mari precisa primeiro saber quanto sua empresa vale hoje.{' '}
              <span className="font-semibold text-foreground">Calcule em <span className="text-accent">60 segundos</span>.</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              {[
                { icon: Sparkles, label: 'Grátis · 60 segundos' },
                { icon: ShieldCheck, label: 'Dados reais do mercado BR' },
                { icon: Target, label: 'Mostra seu potencial em 5 anos' },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-2 text-xs text-foreground/80">
                  <div className="h-7 w-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                    <b.icon className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <span className="font-medium">{b.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Button
                onClick={() => setShowOnboarding(true)}
                size="lg"
                className="text-base px-8 py-6 h-auto bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-lg shadow-accent/30 hover:shadow-accent/50 hover:scale-[1.02] transition-all"
              >
                <Calculator className="h-5 w-5 mr-2" />
                Calcular meu valuation agora
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <p className="text-xs text-muted-foreground sm:ml-2">Sem cartão · Sem cobrança</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <ValuationOnboardingDialog open={showOnboarding} onOpenChange={setShowOnboarding} />
      </>
    );
  }

  return (
    <div className="space-y-8 mb-8">
      <ZoneHeader index={1} title={`Quanto vale, e quanto pode valer.`} subtitle="Sua janela de venda começa agora — leia o que você pode fazer para não deixar dinheiro na mesa." />
      <ValuationTriCard snapshot={snapshot} />

      <ZoneHeader index={2} title="Como o seu mercado está evoluindo" subtitle={`Setor: ${snapshot.segment} · Janela ideal de venda em 2027`} />
      <SectorTrendChart segment={snapshot.segment} />
      <MarketTimeline snapshot={snapshot} />

      <ZoneHeader index={3} title="Seu roadmap de preparação (12-18 meses)" subtitle="Do que você tem hoje para o que o comprador quer pagar prêmio." />
      <ActionPillars snapshot={snapshot} />
      <RoiSummary snapshot={snapshot} />
      <AnonBuyersCard firstName={firstName} />
    </div>
  );
}

function ZoneHeader({ index, title, subtitle }: { index: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 border-l-2 border-accent pl-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-mono">Zona {index}</p>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mt-1 break-words">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1 break-words">{subtitle}</p>
      </div>
    </div>
  );
}

function ValuationTriCard({ snapshot }: { snapshot: ValuationSnapshot }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BigCard
          label={snapshot.hasDiagnostic ? 'Quanto vale hoje (True Value)' : 'Quanto vale hoje (Estimado)'}
          value={brl(snapshot.valorAtual)}
          ic={snapshot.hasDiagnostic
            ? `Estimado de mercado: ${brl(snapshot.valorEstimado)} • −${(snapshot.degradationPct * 100).toFixed(0)}% pelo diagnóstico`
            : `IC: ${brl(snapshot.icLow)} – ${brl(snapshot.icHigh)}`}
          hint={snapshot.ebitdaMargin ? `EBITDA: ${snapshot.ebitdaMargin.toFixed(1)}%` : `Método: ${snapshot.method === 'dcf' ? 'DCF' : 'Múltiplos'}`}
          tone="muted"
        />
        <BigCard
          label="Quanto pode valer (2027)"
          value={brl(snapshot.valorPotencial)}
          ic={`Projeção no pico do mercado · IC: ${brl(snapshot.icLowPot)} – ${brl(snapshot.icHighPot)}`}
          hint={snapshot.ebitdaMarginPotential ? `EBITDA alvo: ${snapshot.ebitdaMarginPotential.toFixed(1)}% · estrutura ideal` : 'Empresa pronta para o comprador certo'}
          tone="accent"
        />
        <BigCard
          label="Seu delta de valor"
          value={`+${brl(snapshot.gap)}`}
          ic={`+${snapshot.gapPct.toFixed(0)}% sobre o valor de hoje`}
          hint="Se você se organizar até 2027"
          tone="emerald"
        />
      </div>
      <Card className="bg-card/40 border-border/50">
        <CardContent className="p-5 text-sm text-muted-foreground break-words">
          <p>
            <span className="text-foreground font-semibold">O que isso significa:</span> Se você completar o roadmap de preparação que mostramos abaixo, sua empresa pode valer
            {' '}<span className="text-accent font-bold">{snapshot.gapPct.toFixed(0)}% mais</span> em 2027. Isso é realista porque
            você terá estrutura profissional, crescimento consistente e uma narrativa clara para o comprador.
            {snapshot.hasDiagnostic
              ? ' O "Quanto vale hoje" é o seu True Value (Estimado descontando os pontos do diagnóstico que ainda não estão resolvidos), exatamente como aparece no relatório de Valuation.'
              : ' Você ainda não respondeu o diagnóstico no relatório — por isso o "Quanto vale hoje" mostra o Estimado puro. Responda o diagnóstico no Valuation para ver seu True Value e o gap real.'}
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function BigCard({ label, value, ic, hint, tone }: { label: string; value: string; ic: string; hint: string; tone: 'muted' | 'accent' | 'emerald' }) {
  const ring = tone === 'accent' ? 'border-accent/40 bg-gradient-to-br from-accent/10 to-transparent'
    : tone === 'emerald' ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent'
    : 'border-border bg-card';
  const valueClass = tone === 'accent' ? 'text-accent' : tone === 'emerald' ? 'text-emerald-500' : 'text-foreground';
  return (
    <Card className={cn('border', ring)}>
      <CardContent className="p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-3">{label}</p>
        <p className={cn('text-3xl md:text-4xl font-bold tabular-nums tracking-tight break-words', valueClass)}>{value}</p>
        <p className="text-xs text-muted-foreground mt-3 font-mono">{ic}</p>
        <p className="text-xs text-muted-foreground/80 mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

function SectorTrendChart({ segment }: { segment: string }) {
  const { data } = useQuery({
    queryKey: ['sector-trends', segment],
    queryFn: async () => {
      const { data } = await (supabase as any).from('sector_market_trends').select('*').eq('segment', segment).order('ano');
      if (!data || data.length === 0) {
        const { data: fallback } = await (supabase as any).from('sector_market_trends').select('*').eq('segment', 'Outros').order('ano');
        return fallback ?? [];
      }
      return data;
    },
  });

  const chartData = useMemo(() => (data ?? []).map((d: any) => ({
    ano: d.ano, deals: Number(d.num_deals), volume: Number(d.volume_m), tendencia: d.tendencia,
  })), [data]);

  const peak = chartData.find((d: any) => d.ano === 2027);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-accent" /> Deals e volume — {segment}</h3>
            <p className="text-xs text-muted-foreground">Pico de demanda projetado em 2027</p>
          </div>
          <div className="flex gap-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/60" /> Histórico</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Projeção</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="grad-deals" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="ano" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12, borderRadius: 8 }}
              formatter={(v: any, name: any) => name === 'deals' ? [`${v} deals`, 'Deals'] : [`R$ ${v}M`, 'Volume']}
            />
            <Area type="monotone" dataKey="deals" stroke="hsl(var(--accent))" strokeWidth={2.5} fill="url(#grad-deals)" />
            {peak && <ReferenceDot x={2027} y={peak.deals} r={6} fill="hsl(var(--accent))" stroke="hsl(var(--background))" strokeWidth={2} label={{ value: 'PICO 2027', position: 'top', fill: 'hsl(var(--accent))', fontSize: 11, fontWeight: 700 }} />}
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
          <p>✓ Taxa de juros em queda — ambiente favorável para PE/LBO</p>
          <p>✓ Escassez de ativos independentes no segmento</p>
          <p>✓ Capital estrangeiro buscando empresas brasileiras</p>
          <p>✓ Últimas janelas antes da consolidação total</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MarketTimeline({ snapshot }: { snapshot: ValuationSnapshot }) {
  const cards = [
    { year: '2026 · Agora', label: 'Comece a se preparar', body: 'Investir em controladoria, máquina de vendas e tese M&A. Investimento estimado: R$ 500k–1M.', tone: 'muted' as const, here: true },
    { year: '2027 · Ideal', label: 'VENDER AQUI', body: `Pico de demanda do setor. Valor potencial: ${brl(snapshot.valorPotencial)}. 12-18 meses de processo até o closing.`, tone: 'accent' as const, here: false },
    { year: '2028 · Tarde', label: 'Mercado em queda', body: `Compradores menos urgentes. Valor estimado: ${brl(snapshot.valorAtual)} (perde ${brl(snapshot.gap)}).`, tone: 'muted' as const, here: false },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.year} className={cn('relative border', c.tone === 'accent' ? 'border-accent bg-gradient-to-br from-accent/15 to-transparent' : 'border-border bg-card/40')}>
          <CardContent className="p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-2">{c.year}</p>
            <h4 className={cn('text-lg font-bold mb-2', c.tone === 'accent' ? 'text-accent' : 'text-foreground')}>{c.label}</h4>
            <p className="text-xs text-muted-foreground break-words">{c.body}</p>
            {c.here && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
                ▼ VOCÊ ESTÁ AQUI
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActionPillars({ snapshot }: { snapshot: ValuationSnapshot }) {
  const pillars = useMemo(() => getPillars(snapshot), [snapshot]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {pillars.map((p) => <PillarCard key={p.key} pillar={p} />)}
    </div>
  );
}

function PillarCard({ pillar }: { pillar: Pillar }) {
  const Icon = ICONS[pillar.icon] ?? Sparkles;
  const roi = pillar.investment > 0 ? Math.round((pillar.returnValue / pillar.investment) * 100) : 0;
  return (
    <Card className="border-border bg-card/60">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center"><Icon className="h-5 w-5" /></div>
          <h4 className="font-bold text-foreground text-base break-words">{pillar.title}</h4>
        </div>
        <PillarBlock title="Problema atual" items={pillar.problem} />
        <PillarBlock title="O que fazer (3-9 meses)" items={pillar.todo} numbered />
        <PillarBlock title="Impacto esperado" items={pillar.impact} />
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Investimento</p>
            <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{brl(pillar.investment)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Retorno</p>
            <p className="text-sm font-bold text-emerald-500 tabular-nums mt-0.5">+{brl(pillar.returnValue)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">ROI</p>
            <p className="text-sm font-bold text-accent tabular-nums mt-0.5">{roi.toLocaleString('pt-BR')}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PillarBlock({ title, items, numbered }: { title: string; items: string[]; numbered?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1.5">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-foreground/90 flex gap-2 break-words">
            <span className="text-accent shrink-0">{numbered ? `${i + 1}.` : '•'}</span><span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoiSummary({ snapshot }: { snapshot: ValuationSnapshot }) {
  const pillars = getPillars(snapshot);
  const totalInv = pillars.reduce((s, p) => s + p.investment, 0);
  const totalRet = pillars.reduce((s, p) => s + p.returnValue, 0);
  const roi = Math.round((totalRet / totalInv) * 100);
  return (
    <Card className="border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-card">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <h3 className="font-bold text-foreground">Resumo: investimento vs. retorno</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryStat label="Investimento total" value={brl(totalInv)} />
          <SummaryStat label="Retorno esperado" value={`+${brl(totalRet)}`} accent="emerald" />
          <SummaryStat label="ROI consolidado" value={`${roi.toLocaleString('pt-BR')}%`} accent="accent" />
          <SummaryStat label="Ganho líquido" value={brl(totalRet - totalInv)} accent="emerald" />
        </div>
        <p className="text-xs text-muted-foreground mt-4 break-words">
          Para cada R$ 1 investido em preparação você captura aproximadamente R$ {(totalRet / totalInv).toFixed(0)} no preço de venda. Esse cálculo assume que você executa os 4 pilares dentro da janela 2026-2027.
        </p>
      </CardContent>
    </Card>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: string; accent?: 'accent' | 'emerald' }) {
  const cls = accent === 'accent' ? 'text-accent' : accent === 'emerald' ? 'text-emerald-500' : 'text-foreground';
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">{label}</p>
      <p className={cn('text-2xl font-bold tabular-nums mt-1 break-words', cls)}>{value}</p>
    </div>
  );
}

function AnonBuyersCard({ firstName }: { firstName: string }) {
  const count = useMemo(() => Math.floor(Math.random() * 12) + 3, []);
  const [open, setOpen] = useState(false);
  const waLink = getWhatsAppLink(`Olá! Sou ${firstName} e quero conversar com um advisor sobre a venda da minha empresa.`);
  return (
    <>
      <Card className="border-accent/40 bg-gradient-to-br from-accent/10 via-card to-card overflow-hidden relative">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-accent" />
            <h3 className="font-bold text-foreground">Quem está olhando para você?</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4 break-words">
            Mapeamos inicialmente <span className="text-accent text-2xl font-bold tabular-nums mx-1">{count}</span>
            possíveis compradores compatíveis com o seu perfil.
          </p>
          <div className="grid grid-cols-3 gap-2 mb-5 text-center">
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-xl font-bold text-foreground tabular-nums">60%</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Consolidadores</p>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-xl font-bold text-foreground tabular-nums">30%</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Strategic</p>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-xl font-bold text-foreground tabular-nums">10%</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">PE / LBO</p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-accent text-secondary-foreground hover:bg-accent/90">
            <Lock className="h-4 w-4 mr-1.5" /> Ver quem são (acesso restrito)
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-accent" /> Acesso restrito</DialogTitle>
            <DialogDescription className="break-words">
              Esses compradores estão sob NDA. Revelar identidade fora do processo certo compromete a negociação. O advisor sabe quando e como apresentar você.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Quando você falar com um advisor Vispe:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><Building2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Ele mostra exatamente quais compradores estão olhando</li>
              <li className="flex gap-2"><Target className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Monta a estratégia de negociação certa</li>
              <li className="flex gap-2"><Calendar className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Acompanha o processo até o closing</li>
            </ul>
          </div>
          <DialogFooter>
            <Button asChild className="w-full bg-accent text-secondary-foreground hover:bg-accent/90">
              <a href={waLink} target="_blank" rel="noreferrer">Falar com advisor agora <ArrowRight className="h-4 w-4 ml-1.5" /></a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
