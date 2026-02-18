import { UserCheck, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openWhatsApp } from '@/lib/whatsapp';
import { toast } from 'sonner';

export function ConsultorBanner() {
  const handleWhatsApp = async () => {
    const msg = 'Olá, vi os matches automáticos na PME.B3 e gostaria de conversar com um consultor sobre oportunidades estratégicas que o algoritmo pode não identificar.';
    const opened = await openWhatsApp(msg);
    if (!opened) {
      toast.info('Link copiado! Cole no navegador para abrir o WhatsApp.');
    }
  };

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-5 mb-6">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-accent/10 p-2.5 shrink-0">
          <UserCheck className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">Consultoria Vispe</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Você está vendo apenas os matches automáticos. Um consultor da Vispe consegue enxergar oportunidades que o algoritmo não vê — como um investidor estratégico de outro setor que quer crescer de forma vertical e gostaria de investir nesse tipo de empresa, mesmo não sendo exatamente o mesmo CNAE. Fale com um consultor e descubra oportunidades escondidas.
          </p>
          <Button size="sm" onClick={handleWhatsApp} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
            <MessageCircle className="w-4 h-4" />
            Falar com consultor
          </Button>
        </div>
      </div>
    </div>
  );
}
