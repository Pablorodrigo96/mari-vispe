import { Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MariBrandStamp } from '@/components/brand/MariBrandStamp';

interface ValuationHeroProps {
  onStartDiagnostic: () => void;
}

export const ValuationHero = ({ onStartDiagnostic }: ValuationHeroProps) => {
  return (
    <section className="relative pt-24 pb-20 bg-gradient-to-b from-primary/5 to-background overflow-hidden">
      <MariBrandStamp position="tr" tone="carbon" size={560} opacity={0.05} />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Descubra o valor da sua empresa{' '}
            <span className="text-gold">em minutos.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Seu Valuation com precisão profissional. Totalmente gratuito, seguro e 
            baseado em dados reais do mercado brasileiro.
          </p>

          <Button
            onClick={onStartDiagnostic}
            size="lg"
            className="bg-gold hover:bg-gold/90 text-gold-foreground text-lg px-8 py-6 shadow-gold"
          >
            Fazer Diagnóstico Gratuito
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          {/* Social Proof */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-gold text-gold" />
              ))}
            </div>
            <span className="text-muted-foreground">
              Mais de <span className="font-semibold text-foreground">1.200 founders</span> já validaram
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
