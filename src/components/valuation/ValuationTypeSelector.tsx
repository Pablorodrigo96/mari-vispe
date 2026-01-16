import { ArrowRight, Star, TrendingUp, Lock, Calculator, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ValuationTypeSelectorProps {
  onSelectFree: () => void;
  onSelectDCF: () => void;
}

export const ValuationTypeSelector = ({
  onSelectFree,
  onSelectDCF,
}: ValuationTypeSelectorProps) => {
  return (
    <section className="pt-24 pb-20 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Descubra o valor da sua empresa{' '}
            <span className="text-accent">em minutos.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            Escolha o método de valuation ideal para o seu momento
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Card Gratuito */}
          <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Múltiplos de Mercado</h3>
                <Badge variant="secondary" className="text-xs">Gratuito</Badge>
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm mb-6">
              Valuation rápido baseado em múltiplos do setor. Ideal para ter uma primeira 
              estimativa do valor da sua empresa.
            </p>

            <ul className="space-y-2 mb-6">
              {[
                'Resultado instantâneo',
                'Baseado em dados do mercado brasileiro',
                'Múltiplos EV/Receita, EV/EBITDA e P/Lucro',
                'Sem necessidade de login',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <Button
              onClick={onSelectFree}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Fazer Valuation Grátis
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Card DCF */}
          <div className="bg-card border-2 border-accent rounded-2xl p-6 relative hover:shadow-lg transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-accent text-accent-foreground">
                Profissional
              </Badge>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Calculator className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Fluxo de Caixa Descontado</h3>
                <Badge variant="outline" className="text-xs">DCF Completo</Badge>
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm mb-6">
              Metodologia profissional com projeções de 3 anos, valor terminal e análise 
              de sensibilidade. O padrão do mercado M&A.
            </p>

            <ul className="space-y-2 mb-6">
              {[
                'Projeção de receita e EBITDA (3 anos)',
                'Cálculo de WACC ajustado por tipo de empresa',
                'Valor terminal com perpetuidade',
                'Análise de sensibilidade (±6%)',
                'Laudo completo em PDF',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4 text-accent flex-shrink-0" />
                  {item}
                </li>
              ))}
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
