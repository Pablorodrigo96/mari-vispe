import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { openWhatsApp } from '@/lib/whatsapp';
import { toast } from 'sonner';
import { ParticlesBackground } from '@/components/ui/particles-background';
import { motion } from 'framer-motion';

export function InvestorCTA() {
  const handleWhatsAppClick = async () => {
    const opened = await openWhatsApp();
    if (!opened) {
      toast.success('Link do WhatsApp copiado! Cole no navegador para abrir.');
    }
  };

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Dark Background */}
      <div className="absolute inset-0 gradient-navy-deep" />
      <div className="absolute inset-0 bg-grid-pattern" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,hsla(38,92%,50%,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,hsla(38,92%,50%,0.06),transparent_40%)]" />
      <ParticlesBackground variant="dark" />
      
      <motion.div 
        className="container relative mx-auto px-4 lg:px-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
          Pronto para encontrar sua próxima oportunidade?
        </h2>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
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
            className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            onClick={handleWhatsAppClick}
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Falar com Especialista
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
