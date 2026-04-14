import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ValuationResult, calculateLossMetrics, LossMetrics } from '@/lib/valuationCalculator';
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
  BarChart3,
  Search,
  Clock,
  MessageCircle,
  Flame,
  ArrowRight,
  ShieldAlert,
  Target,
  Building2,
  User,
  Activity,
} from 'lucide-react';

interface ValuationNarrativeReportProps {
  result: ValuationResult;
  valuationId?: string;
}

const blockVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' },
  }),
};

function AnimatedCounter({ target, duration = 2000, prefix = 'R$ ' }: { target: number; duration?: number; prefix?: string }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
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

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString('pt-BR')}
    </span>
  );
}

export const ValuationNarrativeReport = ({ result, valuationId }: ValuationNarrativeReportProps) => {
  const [loading, setLoading] = useState(false);
  const lossMetrics = calculateLossMetrics(result);
  const segment = result.multiplesUsed.segment;

  const progressPercent = lossMetrics.potentialValue > 0
    ? (lossMetrics.currentValue / lossMetrics.potentialValue) * 100
    : 0;

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
            gapValue: lossMetrics.gapValue,
            calculatedAt: new Date().toISOString(),
          },
          leadScore: lossMetrics.leadScore,
          leadScoreReason: lossMetrics.leadScoreReason,
        },
      });
    } catch {
      // silent fail - non-critical
    }
  }, [valuationId, lossMetrics]);

  useEffect(() => {
    saveMetrics();
  }, [saveMetrics]);

  const handleDiagnostic = async () => {
    setLoading(true);
    const msg = `Olá! Fiz o valuation da minha empresa (${result.inputs.companyName}) e identifiquei um gap de ${formatCurrency(lossMetrics.gapValue)}. Gostaria de fazer o Diagnóstico Estratégico para mapear onde estou perdendo valor.`;
    const opened = await openWhatsApp(msg);
    if (!opened) toast.success('Link copiado! Cole no navegador para abrir o WhatsApp.');
    setLoading(false);
  };

  const handleSpecialist = async () => {
    setLoading(true);
    const msg = `Olá! Fiz o valuation da minha empresa e gostaria de falar com um especialista sobre meu resultado.`;
    const opened = await openWhatsApp(msg);
    if (!opened) toast.success('Link copiado! Cole no navegador para abrir o WhatsApp.');
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 py-6">
      {/* BLOCO 1 — O SONHO */}
      <motion.div
        custom={0}
        variants={blockVariants}
        initial="hidden"
        animate="visible"
        className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6"
      >
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 mb-3">
          POTENCIAL DE MERCADO
        </Badge>
        <p className="text-muted-foreground text-sm mb-2">Se estruturada, sua empresa poderia valer:</p>
        <p className="text-4xl md:text-5xl font-bold text-emerald-600 dark:text-emerald-400">
          {formatFullCurrency(lossMetrics.potentialValue)}
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Com margem EBITDA otimizada em +5 pontos percentuais
        </p>
      </motion.div>

      {/* BLOCO 2 — O CHOQUE */}
      <motion.div
        custom={1}
        variants={blockVariants}
        initial="hidden"
        animate="visible"
        className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6"
      >
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 mb-3">
          AVALIAÇÃO ATUAL
        </Badge>
        <p className="text-muted-foreground text-sm mb-2">Mas hoje, o mercado provavelmente pagaria:</p>
        <p className="text-4xl md:text-5xl font-bold text-amber-600 dark:text-amber-400">
          {formatFullCurrency(lossMetrics.currentValue)}
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Baseado nos múltiplos do setor <strong>{segment}</strong> e seus dados financeiros atuais
        </p>
      </motion.div>

      {/* BLOCO 3 — O GAP */}
      <motion.div
        custom={2}
        variants={blockVariants}
        initial="hidden"
        animate="visible"
        className="bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-800 rounded-xl p-6"
      >
        <div className="w-full h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-muted-foreground text-sm mb-1">Você está deixando na mesa:</p>
            <p className="text-3xl md:text-4xl font-bold text-orange-600 dark:text-orange-400">
              {formatFullCurrency(lossMetrics.gapValue)}
            </p>
          </div>
          <div className="flex items-center sm:justify-end">
            <Badge variant="destructive" className="text-lg px-4 py-1.5 bg-orange-500 hover:bg-orange-600">
              {lossMetrics.gapPercent.toFixed(1)}% abaixo do potencial
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Valor Atual</span>
            <span>Valor Potencial</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <div className="flex justify-between text-xs font-medium">
            <span>{formatCurrency(lossMetrics.currentValue)}</span>
            <span className="text-emerald-600">{formatCurrency(lossMetrics.potentialValue)}</span>
          </div>
        </div>
      </motion.div>

      {/* BLOCO 4 — A VIRADA */}
      <motion.div
        custom={3}
        variants={blockVariants}
        initial="hidden"
        animate="visible"
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

      {/* BLOCO 5 — PERDA REAL 🔥 */}
      <motion.div
        custom={4}
        variants={blockVariants}
        initial="hidden"
        animate="visible"
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
        <p className="text-center text-muted-foreground text-xs mt-2">
          Estimativa baseada em índices de ineficiência operacional para empresas do segmento <strong>{segment}</strong> com faturamento similar
        </p>
      </motion.div>

      {/* BLOCO 6 — CONSEQUÊNCIAS */}
      <motion.div
        custom={5}
        variants={blockVariants}
        initial="hidden"
        animate="visible"
        className="bg-muted/50 border border-border rounded-xl p-6"
      >
        <h3 className="font-semibold text-foreground mb-4">Se esse gap não for corrigido:</h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-foreground">Crescimento travado</p>
              <p className="text-sm text-muted-foreground">Empresas com esse gap crescem mais devagar, ou crescem e quebram por margem insuficiente</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-foreground">Capital mais caro</p>
              <p className="text-sm text-muted-foreground">Captações externas ficam mais difíceis e caras quando a estrutura financeira não é sólida</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-foreground">Empresa não vendável</p>
              <p className="text-sm text-muted-foreground">No momento da venda, o desconto é brutal. Você não vende empresa — vende problema</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* BLOCO 7 — A CAUSA */}
      <motion.div
        custom={6}
        variants={blockVariants}
        initial="hidden"
        animate="visible"
        className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-foreground">Por que esse gap existe?</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          A maioria das empresas nesse estágio não tem problema de produto ou mercado — tem problema de estrutura financeira. 
          Falta controle de margem, previsibilidade de caixa e governança básica. Isso comprime o valuation e limita o crescimento.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 gap-1">
            <BarChart3 className="w-3 h-3" /> Margem
          </Badge>
          <Badge variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 gap-1">
            <Activity className="w-3 h-3" /> Previsibilidade
          </Badge>
          <Badge variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 gap-1">
            <Target className="w-3 h-3" /> Controle
          </Badge>
          <Badge variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 gap-1">
            <Building2 className="w-3 h-3" /> Governança
          </Badge>
          <Badge variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 gap-1">
            <User className="w-3 h-3" /> Dependência do dono
          </Badge>
        </div>
      </motion.div>

      {/* BLOCO 8 — URGÊNCIA */}
      <motion.div
        custom={7}
        variants={blockVariants}
        initial="hidden"
        animate="visible"
        className="bg-[hsl(var(--navy-deep,222_47%_11%))] text-white rounded-xl p-6 text-center"
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
        <p className="text-white/50 text-sm mt-2">
          Empresas não perdem valor de uma vez — perdem todo mês, silenciosamente.
        </p>
      </motion.div>

      {/* BLOCO 9 — CTA FINAL */}
      <motion.div
        custom={8}
        variants={blockVariants}
        initial="hidden"
        animate="visible"
        className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-center text-white"
      >
        <h3 className="text-xl md:text-2xl font-bold mb-2">
          Quer ver exatamente onde está esse dinheiro na sua empresa?
        </h3>
        <p className="text-emerald-100 text-sm mb-6 max-w-lg mx-auto">
          Nosso diagnóstico estratégico mapeia os 5 pilares do seu gap de valuation e mostra o caminho para recuperar esse valor.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={handleDiagnostic}
            disabled={loading}
            className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Fazer Diagnóstico Estratégico
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleSpecialist}
            disabled={loading}
            className="border-white/40 text-white hover:bg-white/10"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Falar com um especialista
          </Button>
        </div>
        <p className="text-emerald-200 text-xs mt-4">
          Empresas que corrigem isso capturam o valor que hoje está sendo perdido todo mês
        </p>
      </motion.div>
    </div>
  );
};
