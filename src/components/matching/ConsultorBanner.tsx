import { UserCheck, MessageCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openWhatsApp } from '@/lib/whatsapp';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const benefits = [
  'Oportunidades que o algoritmo não identifica',
  'Investidores estratégicos de outros setores',
  'Crescimento vertical e horizontal personalizado',
];

export function ConsultorBanner() {
  const handleWhatsApp = async () => {
    const msg = 'Olá, vi os matches automáticos na mari e gostaria de conversar com um consultor sobre oportunidades estratégicas que o algoritmo pode não identificar.';
    const opened = await openWhatsApp(msg);
    if (!opened) {
      toast.info('Link copiado! Cole no navegador para abrir o WhatsApp.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl glass-card border-accent/20 p-6 mb-6 relative overflow-hidden"
    >
      {/* Subtle glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/[0.06] rounded-full blur-[60px]" />

      <div className="flex items-start gap-4 relative z-10">
        <div className="rounded-full gradient-gold p-3 shrink-0 animate-float">
          <UserCheck className="w-5 h-5 text-navy" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-primary-foreground mb-2">Consultoria Vispe</h3>
          <p className="text-sm text-primary-foreground/50 mb-3">
            Você está vendo apenas os matches automáticos. Um consultor descobre oportunidades <span className="text-accent font-medium">que a IA não vê</span>.
          </p>
          <ul className="space-y-1.5 mb-4">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-primary-foreground/60">
                <CheckCircle className="w-3.5 h-3.5 text-accent shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          <Button size="sm" onClick={handleWhatsApp} className="gap-2 gradient-gold text-navy font-semibold hover:opacity-90">
            <MessageCircle className="w-4 h-4" />
            Falar com consultor
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
