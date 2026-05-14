import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ValuationResult } from '@/lib/valuationCalculator';
import {
  DiagnosticAnswers,
  DegradationResult,
  calculateTrueValue,
  calculateTrueValueLossMetrics,
  TrueValueLossMetrics,
  diagnosticItems,
  categoryLabels,
  categoryIcons,
} from '@/lib/diagnosticCalculator';
import { formatCurrency, formatFullCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { openWhatsApp } from '@/lib/whatsapp';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  TrendingDown,
  AlertTriangle,
  Clock,
  MessageCircle,
  Flame,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface ValuationNarrativeReportProps {
  result: ValuationResult;
  valuationId?: string;
  diagnosticAnswers: DiagnosticAnswers;
}

const blockVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

function AnimatedCounter({ target, duration = 2000, prefix = 'R$ ' }: { target: number; duration?: number; prefix?: string }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString('pt-BR')}</span>;
}

export const ValuationNarrativeReport = ({ result, valuationId, diagnosticAnswers }: ValuationNarrativeReportProps) => {
  const [loading, setLoading] = useState(false);

  const degradation: DegradationResult = calculateTrueValue(result, diagnosticAnswers);
  const lossMetrics: TrueValueLossMetrics = calculateTrueValueLossMetrics(result, degradation);
  const segment = result.multiplesUsed.segment;

  const progressPercent = degradation.potentialValue > 0
    ? (degradation.trueValue / degradation.potentialValue) * 100
    : 0;

  // Group breakdown by category
  const categories = ['fiscal', 'financial', 'governance', 'operational'] as const;

  const saveMetrics = useCallback(async () => {
    if (!valuationId) return;
    try {
      await supabase.functions.invoke('update-valuation-metrics', {
        body: {
          valuationId,
          lossMetrics: {
            monthlyLoss: lossMetrics.monthlyLoss,
            annualLoss: lossMetrics.annualLoss,
            recoverTimeMonths: lossMetrics.recoverTimeMonths,
            gap: lossMetrics.gap,
            trueValue: degradation.trueValue,
            potentialValue: degradation.potentialValue,
            totalDegradation: degradation.totalDegradation,
            calculatedAt: new Date().toISOString(),
          },
          diagnosticAnswers,
          leadScore: lossMetrics.leadScore,
          leadScoreReason: lossMetrics.leadScoreReason,
        },
      });
    } catch {
      // silent fail
    }
  }, [valuationId, lossMetrics, degradation, diagnosticAnswers]);

  useEffect(() => { saveMetrics(); }, [saveMetrics]);

  const handleDiagnostic = async () => {
    setLoading(true);
    const msg = `Olá! Fiz o valuation da minha empresa (${result.inputs.companyName}) e identifiquei um gap de ${formatCurrency(lossMetrics.gap)} entre o Valor Verdadeiro e o Potencial. Gostaria de iniciar o processo consultivo.`;
    const opened = await openWhatsApp(msg);
    if (!opened) toast.success('Link copiado! Cole no navegador para abrir o WhatsApp.');
    setLoading(false);
  };

  const handleSpecialist = async () => {
    setLoading(true);
    const msg = `Olá! Fiz o diagnóstico de valor da minha empresa e gostaria de falar com um especialista sobre meu resultado.`;
    const opened = await openWhatsApp(msg);
    if (!opened) toast.success('Link copiado! Cole no navegador para abrir o WhatsApp.');
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 py-6">
      {/* BLOCO 1 — VALOR POTENCIAL */}
      <motion.div custom={0} variants={blockVariants} initial="hidden" animate="visible"
        className="bg-card border border-volt/30 rounded-xl p-6"
      >
        <Badge className="bg-volt/15 text-volt-dark border-volt/30 mb-3 hover:bg-volt/20">
          VALOR POTENCIAL
        </Badge>
        <p className="text-muted-foreground text-sm mb-2">Após consultoria mari, sua empresa poderia valer:</p>
        <p className="text-4xl md:text-5xl font-bold text-foreground tabular-nums">
          {formatFullCurrency(degradation.potentialValue)}
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Média de <strong className="text-foreground">+35% de valorização</strong> em clientes atendidos pela mari
        </p>
      </motion.div>

      {/* BLOCO 2 — VALOR ESTIMADO */}
      <motion.div custom={1} variants={blockVariants} initial="hidden" animate="visible"
        className="bg-card border border-border rounded-xl p-6"
      >
        <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border mb-3">
          ESTIMATIVA DE MERCADO
        </Badge>
        <p className="text-muted-foreground text-sm mb-2">Pelos múltiplos do setor <strong className="text-foreground">{segment}</strong>:</p>
        <p className="text-3xl md:text-4xl font-bold text-foreground tabular-nums">
          {formatFullCurrency(degradation.estimatedValue)}
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Mashup Value — média de {result.validMethods} métodos
        </p>
      </motion.div>

      {/* BLOCO 3 — DIAGNÓSTICO */}
      <motion.div custom={2} variants={blockVariants} initial="hidden" animate="visible"
        className="bg-card border border-border rounded-xl p-6"
      >
        <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border mb-3">
          RESULTADO DO DIAGNÓSTICO
        </Badge>
        <p className="text-muted-foreground text-sm mb-4">
          Cada item negativo reduz o valor que o mercado pagaria pela sua empresa hoje:
        </p>
        <div className="space-y-4">
          {categories.map((cat) => {
            const items = degradation.itemBreakdown.filter((b) => b.item.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {categoryIcons[cat]} {categoryLabels[cat]}
                </p>
                <div className="space-y-1.5">
                  {items.map((b) => (
                    <div key={b.item.key} className="flex items-center justify-between text-sm gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {b.answer ? (
                          <CheckCircle2 className="w-4 h-4 text-volt-dark flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        )}
                        <span className={`truncate ${b.answer ? 'text-foreground' : 'text-destructive font-medium'}`}>
                          {b.item.label}
                        </span>
                      </div>
                      {!b.answer && (
                        <span className="text-destructive text-xs font-semibold flex-shrink-0 tabular-nums">
                          -{formatCurrency(b.impact)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {degradation.totalDegradation > 0 && (
          <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
            <span className="text-sm font-semibold text-foreground">Degradação total</span>
            <Badge variant="destructive" className="text-sm">
              -{(degradation.totalDegradation * 100).toFixed(0)}% do valor estimado
            </Badge>
          </div>
        )}
      </motion.div>

      {/* BLOCO 4 — VALOR VERDADEIRO */}
      <motion.div custom={3} variants={blockVariants} initial="hidden" animate="visible"
        className="bg-destructive/5 border border-destructive/30 rounded-xl p-6 text-center"
      >
        <Badge variant="destructive" className="mb-3">
          <AlertTriangle className="w-3 h-3 mr-1" />
          VALOR VERDADEIRO
        </Badge>
        <p className="text-muted-foreground text-sm mb-2">
          Considerando as lacunas identificadas, o valor real da sua empresa hoje é:
        </p>
        <p className="text-4xl md:text-5xl font-bold text-destructive tabular-nums">
          {formatFullCurrency(degradation.trueValue)}
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          {(degradation.totalDegradation * 100).toFixed(0)}% abaixo da estimativa de mercado
        </p>
      </motion.div>

      {/* BLOCO 5 — O GAP */}
      <motion.div custom={4} variants={blockVariants} initial="hidden" animate="visible"
        className="bg-card border border-border rounded-xl p-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-muted-foreground text-sm mb-1">Gap entre True Value e Potencial:</p>
            <p className="text-3xl md:text-4xl font-bold text-foreground tabular-nums">
              {formatFullCurrency(lossMetrics.gap)}
            </p>
          </div>
          <div className="flex items-center sm:justify-end">
            <Badge className="bg-volt text-carbon hover:bg-volt-light text-base px-4 py-1.5 font-semibold">
              +{lossMetrics.gapPercent.toFixed(0)}% de upside
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Valor Verdadeiro</span>
            <span>Valor Potencial</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <div className="flex justify-between text-xs font-medium tabular-nums">
            <span className="text-destructive">{formatCurrency(degradation.trueValue)}</span>
            <span className="text-foreground">{formatCurrency(degradation.potentialValue)}</span>
          </div>
        </div>
      </motion.div>

      {/* BLOCO 6 — A VIRADA */}
      <motion.div custom={5} variants={blockVariants} initial="hidden" animate="visible"
        className="text-center py-8 space-y-3"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="h-px w-16 bg-border" />
          <TrendingDown className="w-6 h-6 text-muted-foreground" />
          <div className="h-px w-16 bg-border" />
        </div>
        <p className="text-xl md:text-2xl font-medium text-foreground">
          E isso não acontece só na venda.
        </p>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Esse gap começa muito antes — ele começa no dinheiro que você deixa de ganhar todo mês.
        </p>
      </motion.div>

      {/* BLOCO 7 — PERDA REAL 🔥 */}
      <motion.div custom={6} variants={blockVariants} initial="hidden" animate="visible"
        className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-6"
      >
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300 dark:border-red-700 mb-3">
          <Flame className="w-3 h-3 mr-1" />
          IMPACTO MENSAL
        </Badge>
        <p className="text-muted-foreground text-sm mb-3">Hoje, sua empresa está perdendo aproximadamente:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-red-100 dark:bg-red-900/40 rounded-lg p-4 text-center">
            <p className="text-3xl md:text-4xl font-bold text-red-600 dark:text-red-400">
              {formatFullCurrency(lossMetrics.monthlyLoss)}
            </p>
            <p className="text-red-500 text-sm font-medium mt-1">por mês</p>
          </div>
          <div className="bg-red-100/60 dark:bg-red-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl md:text-3xl font-bold text-red-500 dark:text-red-400">
              {formatFullCurrency(lossMetrics.annualLoss)}
            </p>
            <p className="text-red-400 text-sm font-medium mt-1">por ano</p>
          </div>
        </div>
        <div className="h-px bg-red-200 dark:bg-red-800 my-4" />
        <p className="text-center font-semibold text-foreground">
          Você não perde esse dinheiro na venda — você perde todo mês.
        </p>
      </motion.div>

      {/* BLOCO 8 — URGÊNCIA */}
      <motion.div custom={7} variants={blockVariants} initial="hidden" animate="visible"
        className="rounded-xl p-6 text-center text-white"
        style={{ background: 'hsl(222, 47%, 11%)' }}
      >
        <Clock className="w-8 h-8 mx-auto mb-3 text-amber-400" />
        <p className="text-white/70 text-sm mb-2">A cada mês sem ação, você acumula:</p>
        <p className="text-3xl md:text-4xl font-bold text-amber-400 mb-4">
          <AnimatedCounter target={Math.round(lossMetrics.monthlyLoss)} />
        </p>
        <div className="h-px bg-white/10 my-4" />
        <p className="text-lg font-medium text-white">
          Não decidir também é uma decisão — e ela custa dinheiro.
        </p>
      </motion.div>

      {/* BLOCO 9 — CTA FINAL */}
      <motion.div custom={8} variants={blockVariants} initial="hidden" animate="visible"
        className="rounded-xl p-6 text-center bg-volt border border-volt-dark/20"
      >
        <h3 className="text-xl md:text-2xl font-bold mb-2 text-carbon">
          Quer fechar esse gap e capturar o valor potencial?
        </h3>
        <p className="text-carbon/75 text-sm mb-6 max-w-lg mx-auto">
          A mari já gerou em média <strong className="text-carbon">+35% de valorização</strong> nos clientes atendidos. Comece agora.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={handleDiagnostic} disabled={loading}
            className="bg-carbon text-volt hover:bg-graphite font-semibold"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Iniciar Processo Consultivo
          </Button>
          <Button size="lg" variant="outline" onClick={handleSpecialist} disabled={loading}
            className="bg-transparent border-carbon/30 text-carbon hover:bg-carbon/5 hover:text-carbon"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Falar com um especialista
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
