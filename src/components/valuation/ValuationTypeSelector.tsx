import { ArrowRight, Star, TrendingUp, Lock, Calculator, BarChart3, Crown, Check, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useValuationAccess, VALUATION_PRICES } from '@/hooks/useValuationAccess';
import { useAuth } from '@/contexts/AuthContext';

interface ValuationTypeSelectorProps {
  onSelectFree: () => void;
  onSelectDCF: () => void;
  onBuyMultiples?: () => void;
  onBuyDCF?: () => void;
  onSubscribeMaster?: () => void;
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
    <section className="pt-24 pb-20 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Descubra o valor da sua empresa{' '}
            <span className="text-accent">em minutos.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            Escolha seu plano ou compre valuations individualmente
          </p>

          {user && !loading && (
            <div className="inline-flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full text-sm">
              <span className="text-muted-foreground">Seu plano:</span>
              <Badge variant={isMasterPlan ? 'default' : 'secondary'} className={isMasterPlan ? 'bg-accent text-accent-foreground' : ''}>
                {planName}
              </Badge>
              <span className="text-muted-foreground">
                • {remainingMultiples()} múltiplos • {remainingDCF()} DCF
              </span>
            </div>
          )}
        </div>

        {/* Plans Section */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {/* Basic Plan */}
          <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Plano Básico</h3>
                <Badge variant="secondary" className="text-xs">Gratuito</Badge>
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-3xl font-bold text-foreground">Grátis</span>
            </div>

            <ul className="space-y-2 mb-6">
              {basicPlanFeatures.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm text-muted-foreground/60">
                <Lock className="w-4 h-4 flex-shrink-0" />
                Sem acesso ao DCF
              </li>
            </ul>

            {!isMasterPlan && user ? (
              <div className="text-center py-2 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                Seu plano atual
              </div>
            ) : !user ? (
              <Button
                onClick={onSelectFree}
                variant="outline"
                className="w-full"
              >
                Começar Grátis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : null}
          </div>

          {/* Master Plan */}
          <div className="bg-card border-2 border-accent rounded-2xl p-6 relative hover:shadow-lg transition-all">
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
                <h3 className="font-semibold text-foreground text-lg">Plano Master</h3>
                <Badge variant="outline" className="text-xs">Acesso Completo</Badge>
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-3xl font-bold text-foreground">R$ 297</span>
              <span className="text-muted-foreground">/mês</span>
            </div>

            <ul className="space-y-2 mb-6">
              {masterPlanFeatures.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
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
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled // Stripe não configurado
              >
                Assinar Master (em breve)
              </Button>
            )}
          </div>
        </div>

        {/* Individual Purchase Section */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Ou compre individualmente
            </h2>
            <p className="text-muted-foreground">
              Valuations avulsos sem assinatura mensal
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Buy Multiples */}
            <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Múltiplos de Mercado</h3>
                    <p className="text-xs text-muted-foreground">Valuation rápido</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">{formatPrice(VALUATION_PRICES.multiples)}</span>
                  <p className="text-xs text-muted-foreground">único</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onBuyMultiples}
                disabled // Stripe não configurado
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Comprar (em breve)
              </Button>
            </div>

            {/* Buy DCF */}
            <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-medium">Fluxo de Caixa Descontado</h3>
                    <p className="text-xs text-muted-foreground">DCF Profissional</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">{formatPrice(VALUATION_PRICES.dcf)}</span>
                  <p className="text-xs text-muted-foreground">único</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onBuyDCF}
                disabled // Stripe não configurado
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Comprar (em breve)
              </Button>
            </div>
          </div>
        </div>

        {/* Start Valuation Buttons */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Iniciar Valuation
            </h2>
            <p className="text-muted-foreground">
              Use seus créditos disponíveis para fazer um valuation agora
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Start Multiples */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Múltiplos de Mercado</h3>
                  <p className="text-sm text-muted-foreground">Resultado instantâneo</p>
                </div>
              </div>
              
              <ul className="space-y-1 mb-4 text-sm text-muted-foreground">
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
            <div className="bg-gradient-to-br from-accent/10 to-transparent border border-accent/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Fluxo de Caixa Descontado</h3>
                  <p className="text-sm text-muted-foreground">Metodologia profissional</p>
                </div>
              </div>
              
              <ul className="space-y-1 mb-4 text-sm text-muted-foreground">
                <li>• Projeção de 3 anos + valor terminal</li>
                <li>• Análise de sensibilidade inclusa</li>
              </ul>

              <Button
                onClick={onSelectDCF}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Lock className="w-4 h-4 mr-2" />
                Fazer Valuation DCF
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-2">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-accent text-accent" />
            ))}
          </div>
          <span className="text-muted-foreground">
            Mais de <span className="font-semibold text-foreground">1.200 founders</span> já validaram
          </span>
        </div>
      </div>
    </section>
  );
};
