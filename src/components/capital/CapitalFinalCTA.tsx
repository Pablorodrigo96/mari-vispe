import { MessageCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openWhatsApp } from '@/lib/whatsapp';

export function CapitalFinalCTA() {
  return (
    <section className="py-20 bg-accent/5">
      <div className="container mx-auto px-4 lg:px-8 text-center max-w-2xl">
        <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
          Pronto para captar recursos?
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Fale agora com um especialista e receba uma proposta personalizada para sua empresa.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold"
            onClick={() => openWhatsApp('Olá! Vim pela plataforma Vispe e gostaria de falar sobre captação de recursos para minha empresa.')}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Falar com especialista via WhatsApp
          </Button>

          <Button size="lg" variant="outline" disabled className="opacity-60">
            <Calendar className="w-5 h-5 mr-2" />
            Agendar reunião (em breve)
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Atendimento de segunda a sexta, das 9h às 18h. Sem compromisso.
        </p>
      </div>
    </section>
  );
}
