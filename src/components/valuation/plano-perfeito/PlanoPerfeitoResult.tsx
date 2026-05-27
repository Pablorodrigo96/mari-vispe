import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, MessageCircle, RotateCcw, TrendingUp, Users, Wallet, Target, Calendar, Lock, ArrowRight } from 'lucide-react';
import type { PlanoPerfeitoResult as PPResult } from '@/lib/planoPerfeitoCalculator';
import { PlanoPerfeitoChart } from './PlanoPerfeitoChart';
import { ViabilitySemaforo } from './ViabilitySemaforo';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);

const formatCompact = (n: number) => {
  if (n >= 1_000_000_000) return `R$ ${(n / 1_000_000_000).toFixed(2).replace('.', ',')} Bi`;
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} Mi`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)} mil`;
  return formatBRL(n);
};

const formatInt = (n: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));

/** Hook simples para animar contagem até o valor */
const useCountUp = (target: number, durationMs = 1500) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return v;
};

interface Props {
  result: PPResult;
  onRestart: () => void;
  onConsultoria: () => void;
  isLoggedIn?: boolean;
  onAcessarRelatorio?: () => void;
}

export const PlanoPerfeitoResultView = ({ result, onRestart, onConsultoria, isLoggedIn, onAcessarRelatorio }: Props) => {
  const animatedInvest = useCountUp(result.investimentoMensal);

  const metrics = [
    { Icon: Wallet,   label: 'Investimento mensal em CAC',  value: formatBRL(result.investimentoMensal) },
    { Icon: Wallet,   label: 'Investimento anual em CAC',   value: formatBRL(result.investimentoAnual) },
    { Icon: Wallet,   label: 'Investimento total no período', value: formatCompact(result.investimentoTotal) },
    { Icon: Users,    label: 'Clientes novos (total)',       value: formatInt(result.clientesNovosTotal) },
    { Icon: Users,    label: 'Clientes novos / mês',         value: formatInt(result.clientesPorMes) },
    { Icon: Users,    label: 'Clientes novos / ano',         value: formatInt(result.clientesPorAno) },
    { Icon: TrendingUp, label: 'Faturamento alvo no fim do período', value: formatCompact(result.receitaAlvo) },
    { Icon: Target,   label: 'Múltiplo aplicado',            value: `${result.multiploReceita.toFixed(1)}x` },
  ];

  return (
    <div className="space-y-8">
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border-2 border-accent/40 bg-gradient-to-br from-accent/15 via-card to-card p-6 sm:p-10 text-center shadow-[0_0_80px_-20px_hsl(var(--accent)/0.5)]"
      >
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
        <div className="relative space-y-3">
          <Badge className="bg-accent/20 text-accent border-accent/40 mx-auto">SEU PLANO PERFEITO</Badge>
          <p className="text-sm sm:text-base text-muted-foreground break-words">
            Para sua empresa valer <strong className="text-foreground">{formatCompact(result.valuationMeta)}</strong>
            {' '}em <strong className="text-foreground">{result.prazoAnos} {result.prazoAnos === 1 ? 'ano' : 'anos'}</strong>:
          </p>
          <p className="text-4xl sm:text-6xl lg:text-7xl font-black text-accent tabular-nums leading-none break-words">
            {formatBRL(animatedInvest)}
          </p>
          <p className="text-sm sm:text-base font-semibold text-foreground/80">
            por mês em aquisição de clientes
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto pt-2 break-words">
            Isso é o que separa sua empresa atual da sua meta.
          </p>
        </div>
      </motion.div>

      {/* SEMÁFORO */}
      <ViabilitySemaforo
        viabilidade={result.viabilidade}
        mensagem={result.viabilidadeMensagem}
        percentualReceita={result.percentualDaReceita}
      />

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card/60 p-4">
            <m.Icon className="h-4 w-4 text-accent mb-2" />
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground leading-tight break-words">{m.label}</p>
            <p className="mt-1 text-base sm:text-lg font-bold text-foreground tabular-nums break-words">{m.value}</p>
          </div>
        ))}
      </div>

      {/* GRÁFICO */}
      <PlanoPerfeitoChart result={result} />

      {/* CONTEXTO valuation atual */}
      <div className="rounded-xl border border-border bg-card/40 p-4 grid sm:grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Valuation atual</p>
          <p className="text-lg font-bold text-foreground tabular-nums">{formatCompact(result.valuationAtual)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Gap até a meta</p>
          <p className="text-lg font-bold text-accent tabular-nums">{formatCompact(Math.max(0, result.gapValuation))}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Prazo</p>
          <p className="text-lg font-bold text-foreground flex items-center justify-center gap-1.5">
            <Calendar className="h-4 w-4" /> {result.prazoAnos} anos
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <Button
          size="lg"
          onClick={() => window.print()}
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold flex-1"
        >
          <Download className="h-4 w-4 mr-2" /> Salvar meu Plano (PDF)
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onConsultoria}
          className="flex-1 bg-transparent border-accent/40 hover:bg-accent/10"
        >
          <MessageCircle className="h-4 w-4 mr-2" /> Refinar com Consultoria VispeCapital
        </Button>
        <Button
          size="lg"
          variant="ghost"
          onClick={onRestart}
          className="sm:w-auto"
        >
          <RotateCcw className="h-4 w-4 mr-2" /> Refazer
        </Button>
      </div>
    </div>
  );
};
