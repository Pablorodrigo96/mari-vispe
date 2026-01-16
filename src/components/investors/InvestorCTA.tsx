import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle } from 'lucide-react';

export function InvestorCTA() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-navy" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,hsl(var(--gold)/0.15),transparent_50%)]" />
      
      <div className="container relative mx-auto px-4 lg:px-8 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
          Pronto para encontrar sua próxima oportunidade?
        </h2>
        <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8">
          Junte-se a centenas de investidores que já descobriram negócios lucrativos através da DealFlow.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold">
            <Link to="/marketplace">
              Ver Marketplace
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10">
            <a href="https://wa.me/5551992338258" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-5 w-5" />
              Falar com Especialista
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
