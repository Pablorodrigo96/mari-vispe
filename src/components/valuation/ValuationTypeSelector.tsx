import { ArrowRight, Star, TrendingUp, Lock, Calculator, BarChart3, Crown, Check, CreditCard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ParticlesBackground } from '@/components/ui/particles-background';
import { motion } from 'framer-motion';
import { useValuationAccess, VALUATION_PRICES } from '@/hooks/useValuationAccess';
import { useAuth } from '@/contexts/AuthContext';
import { PlanoPerfeitoBanner } from '@/components/valuation/plano-perfeito/PlanoPerfeitoBanner';

interface ValuationTypeSelectorProps {
  onSelectFree: () => void;
  onSelectDCF: () => void;
  onBuyMultiples?: () => void;
  onBuyDCF?: () => void;
  onSubscribeMaster?: () => void;
  onOpenCertifier?: () => void;
  onStartPlanoPerfeito?: () => void;
}

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
};

export const ValuationTypeSelector = ({
  onSelectFree,
  onSelectDCF,
  onBuyMultiples,
  onBuyDCF,
  onSubscribeMaster,
  onOpenCertifier,
}: ValuationTypeSelectorProps) => {
  const { user } = useAuth();
  const { 
    planName, 
    isMasterPlan, 
    remainingMultiples, 
    remainingDCF,
    loading,
  } = useValuationAccess();

  const basicPlanFeatures = [
    '1 Valuation por Múltiplos',
    'Resultado instantâneo',
    'Relatório básico',
  ];

  const masterPlanFeatures = [
    '5 Valuations por Múltiplos/mês',
    '3 Valuations DCF/mês',
    'Relatórios completos em PDF',
    'Análise de sensibilidade',
    'Suporte prioritário',
    'Histórico de valuations',
  ];

  return (
    <section className="relative pt-20 pb-16 md:pt-24 md:pb-20 overflow-hidden">
      {/* Dark Background */}
      <div className="absolute inset-0 gradient-navy-deep" />
      <div className="absolute inset-0 bg-grid-pattern" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,hsla(38,92%,50%,0.1),transparent_50%)]" />
      <ParticlesBackground variant="dark" />

      <div className="container relative mx-auto px-4">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Valuation Inteligente
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Quanto vale sua empresa?{' '}
            <span className="text-gradient-gold">Descubra agora.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-white/60 mb-4 max-w-2xl mx-auto">
            87% dos empresários não sabem o valor real do seu negócio — e perdem dinheiro por isso.
          </p>

          <div className="flex flex-col sm:inline-flex sm:flex-row items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl sm:rounded-full bg-accent/10 border border-accent/30 text-accent/90 text-xs sm:text-sm font-medium mb-8 mx-auto text-center max-w-full">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="break-words">Seus dados financeiros são sigilosos. Nenhum terceiro acessa sem sua autorização.</span>
          </div>

          <Button
            onClick={onSelectFree}
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-6 shadow-gold mb-8 w-full sm:w-auto max-w-xs sm:max-w-none whitespace-normal text-center leading-tight"
          >
            Descobrir Meu Valor Grátis
            <ArrowRight className="w-5 h-5 ml-2 shrink-0" />
          </Button>

          {/* Animated counters */}
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8 mt-4">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">+1.200</p>
              <p className="text-xs text-white/50">valuations realizados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">R$ 2.8B</p>
              <p className="text-xs text-white/50">em empresas avaliadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">3 min</p>
              <p className="text-xs text-white/50">para seu resultado</p>
            </div>
          </div>

          {user && !loading && (
            <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full text-sm mt-6">
              <span className="text-white/60">Seu plano:</span>
              <Badge variant={isMasterPlan ? 'default' : 'secondary'} className={isMasterPlan ? 'bg-accent text-accent-foreground' : ''}>
                {planName}
              </Badge>
              <span className="text-white/60">
                • {remainingMultiples()} múltiplos • {remainingDCF()} DCF
              </span>
            </div>
          )}
        </motion.div>

        {/* Plans headline */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <h2 className="text-xl sm:text-2xl font-semibold text-white">
            Escolha como calcular o valor da sua empresa
          </h2>
        </motion.div>

        {/* Plans Section */}
        <motion.div 
          className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Basic Plan */}
          <div className="glass-card rounded-2xl p-6 hover:border-white/20 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white/60" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">Plano Básico</h3>
                <Badge variant="secondary" className="text-xs">Gratuito</Badge>
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-3xl font-bold text-white">Grátis</span>
            </div>

            <ul className="space-y-2 mb-6">
              {basicPlanFeatures.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm text-white/30">
                <Lock className="w-4 h-4 flex-shrink-0" />
                Sem acesso ao DCF
              </li>
            </ul>

            {!isMasterPlan && user ? (
              <div className="text-center py-2 text-sm text-white/50 border border-dashed border-white/20 rounded-lg">
                Seu plano atual
              </div>
            ) : !user ? (
              <Button
                onClick={onSelectFree}
                className="w-full bg-white text-gray-900 hover:bg-white/90"
              >
                Começar Grátis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : null}
          </div>

          {/* Master Plan */}
          <div className="glass-card rounded-2xl p-6 relative border-accent/30 hover:border-accent/50 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-accent text-accent-foreground">
                <Crown className="w-3 h-3 mr-1" />
                Recomendado
              </Badge>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Crown className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">Plano Master</h3>
                <Badge variant="outline" className="text-xs text-white/60 border-white/20">Acesso Completo</Badge>
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-3xl font-bold text-white">R$ 697</span>
              <span className="text-white/50">/mês</span>
            </div>

            <ul className="space-y-2 mb-6">
              {masterPlanFeatures.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            {isMasterPlan ? (
              <div className="text-center py-2 text-sm text-accent border border-accent/30 bg-accent/5 rounded-lg font-medium">
                ✓ Seu plano atual
              </div>
            ) : (
              <Button
                onClick={onSubscribeMaster}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold"
              >
                Assinar Master
              </Button>
            )}
          </div>
        </motion.div>

        {/* Individual Purchase Section */}
        <motion.div 
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">
              Ou compre individualmente
            </h2>
            <p className="text-white/50">
              Valuations avulsos sem assinatura mensal
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Buy Multiples */}
            <div className="glass-card rounded-xl p-5 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Múltiplos de Mercado</h3>
                    <p className="text-xs text-white/40">Valuation rápido</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-white">{formatPrice(VALUATION_PRICES.multiples)}</span>
                  <p className="text-xs text-white/40">único</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-white/20 text-white bg-primary hover:bg-primary/90"
                onClick={onBuyMultiples}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Comprar Agora
              </Button>
            </div>

            {/* Buy DCF */}
            <div className="glass-card rounded-xl p-5 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Fluxo de Caixa Descontado</h3>
                    <p className="text-xs text-white/40">DCF Profissional</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-white">{formatPrice(VALUATION_PRICES.dcf)}</span>
                  <p className="text-xs text-white/40">único</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-white/20 text-white bg-primary hover:bg-primary/90"
                onClick={onBuyDCF}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Comprar Agora
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Start Valuation Buttons */}
        <motion.div 
          className="max-w-4xl mx-auto mt-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              Iniciar Valuation
            </h2>
            <p className="text-white/50">
              Use seus créditos disponíveis para fazer um valuation agora
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {/* Start Multiples */}
            <div className="glass-card rounded-xl p-6 border-emerald-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Múltiplos de Mercado</h3>
                  <p className="text-sm text-white/50">Resultado instantâneo</p>
                </div>
              </div>
              
              <ul className="space-y-1 mb-4 text-sm text-white/50">
                <li>• Baseado em dados do mercado brasileiro</li>
                <li>• Múltiplos EV/Receita, EV/EBITDA e P/Lucro</li>
              </ul>

              <Button
                onClick={onSelectFree}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Fazer Valuation Múltiplos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Start DCF */}
            <div className="glass-card rounded-xl p-6 border-accent/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Fluxo de Caixa Descontado</h3>
                  <p className="text-sm text-white/50">Metodologia profissional</p>
                </div>
              </div>
              
              <ul className="space-y-1 mb-4 text-sm text-white/50">
                <li>• Projeção de 3 anos + valor terminal</li>
                <li>• Análise de sensibilidade inclusa</li>
              </ul>

              <Button
                onClick={onSelectDCF}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold"
              >
                <Lock className="w-4 h-4 mr-2" />
                Fazer Valuation DCF
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Certifier */}
            <div className="glass-card rounded-xl p-6 border-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Certificador</h3>
                  <p className="text-sm text-white/50">Valide um valuation recebido</p>
                </div>
              </div>
              
              <ul className="space-y-1 mb-4 text-sm text-white/50">
                <li>• Compare com múltiplos de mercado</li>
                <li>• Relatório de assertividade grátis</li>
              </ul>

              <Button
                onClick={onOpenCertifier}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Certificar Valuation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Social Proof */}
        <motion.div 
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-accent text-accent" />
            ))}
          </div>
          <span className="text-white/50">
            Mais de <span className="font-semibold text-white">1.200 founders</span> já validaram
          </span>
        </motion.div>
      </div>
    </section>
  );
};
