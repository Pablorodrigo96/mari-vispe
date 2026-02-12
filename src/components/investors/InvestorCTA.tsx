import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { openWhatsApp } from '@/lib/whatsapp';
import { toast } from 'sonner';

export function InvestorCTA() {
  const handleWhatsAppClick = async () => {
    const opened = await openWhatsApp();
    if (!opened) {
      toast.success('Link do WhatsApp copiado! Cole no navegador para abrir.');
    }
  };

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
          Junte-se a centenas de investidores que já descobriram negócios lucrativos através da PME.B3.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold">
            <Link to="/marketplace">
              Ver Marketplace
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="border-white/30 text-white hover:bg-white/10"
            onClick={handleWhatsAppClick}
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Falar com Especialista
          </Button>
        </div>
      </div>
    </section>
  );
}
