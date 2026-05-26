import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface Props {
  onStart: () => void;
}

export const PlanoPerfeitoBanner = ({ onStart }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative mb-10 overflow-hidden rounded-3xl border-2 border-accent/40 bg-gradient-to-br from-accent/15 via-card to-card p-6 sm:p-10 shadow-[0_0_60px_-15px_hsl(var(--accent)/0.45)]"
    >
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="space-y-3 max-w-2xl">
          <Badge className="bg-accent text-accent-foreground hover:bg-accent gap-1.5 font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> 🚀 Novidade
          </Badge>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight break-words">
            O Plano Perfeito
          </h2>

          <p className="text-lg sm:text-xl font-semibold text-accent break-words">
            Construa a ponte da sua empresa até o bilhão
          </p>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed break-words max-w-xl">
            Descubra exatamente quanto você precisa investir por mês para sua empresa atingir
            R$ 10 milhões, R$ 100 Mi, R$ 500 Mi, R$ 1 Bi ou a meta que você definir.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <Button
            size="lg"
            onClick={onStart}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base shadow-lg shadow-accent/40 group"
          >
            Traçar Meu Plano Perfeito
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="text-xs text-muted-foreground font-medium">Gratuito · 3 minutos</p>
        </div>
      </div>
    </motion.div>
  );
};
