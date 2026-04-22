import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ValuationFooterCTAProps {
  onStartDiagnostic: () => void;
}

export const ValuationFooterCTA = ({ onStartDiagnostic }: ValuationFooterCTAProps) => {
  return (
    <section className="py-16 gradient-navy">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
            Cada dia sem saber seu valor é dinheiro na mesa.
          </h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Não espere uma oferta para descobrir quanto vale. Comece agora — é grátis.
          </p>
          <Button
            onClick={onStartDiagnostic}
            size="lg"
            className="bg-gold hover:bg-gold/90 text-gold-foreground text-lg px-8 py-6 shadow-gold"
          >
            Iniciar Diagnóstico Agora
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="mt-6 text-primary-foreground/60 text-sm">
            © {new Date().getFullYear()} PME.B3. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </section>
  );
};
