import { ArrowRight, Sparkles, Target, TrendingUp, Route, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ParticlesBackground } from '@/components/ui/particles-background';
import { motion } from 'framer-motion';

interface Props {
  onStart: () => void;
}

const pillars = [
  { icon: Target, label: 'De onde você está', desc: 'Diagnóstico real do valor atual' },
  { icon: TrendingUp, label: 'Aonde quer chegar', desc: 'R$ 10 Mi, R$ 100 Mi, R$ 1 Bi' },
  { icon: Route, label: 'Como chegar lá', desc: 'Investimento mensal e prazo' },
];

export const PlanoPerfeitoHero = ({ onStart }: Props) => {
  const scrollDown = () => {
    window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* Backgrounds */}
      <div className="absolute inset-0 bg-[hsl(var(--background))]" />
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[hsl(var(--background))] to-black" />
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.25),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.18),transparent_55%)]" />
      <ParticlesBackground variant="dark" />

      {/* Glow orbs */}
      <motion.div
        className="absolute top-1/4 -left-32 h-[28rem] w-[28rem] rounded-full bg-accent/30 blur-[120px] pointer-events-none"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-32 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-[120px] pointer-events-none"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.6, 0.4, 0.6] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="container relative mx-auto px-4 py-20 md:py-24">
        <div className="max-w-6xl mx-auto text-center">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 border border-accent/40 text-accent text-sm font-semibold mb-8 backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>🚀 Novidade · O Plano Perfeito</span>
          </motion.div>

          {/* Brand line */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-sm sm:text-base uppercase tracking-[0.3em] text-white/50 font-medium mb-4"
          >
            O Plano Perfeito
          </motion.p>

          {/* Mega headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.05] tracking-tight mb-8 break-words"
          >
            Construa a ponte da{' '}
            <span className="block sm:inline">
              sua empresa até o{' '}
              <span className="relative inline-block">
                <span className="text-gradient-gold">bilhão</span>
                <motion.span
                  className="absolute inset-0 text-gradient-gold blur-2xl opacity-50"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  aria-hidden
                >
                  bilhão
                </motion.span>
              </span>
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg sm:text-xl md:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed mb-12 break-words"
          >
            Descubra exatamente quanto você precisa investir por mês para sua empresa atingir
            a meta de valuation que você sonhar — em meses, não décadas.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4"
          >
            <Button
              size="lg"
              onClick={onStart}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base sm:text-lg px-8 sm:px-12 py-6 sm:py-7 h-auto shadow-[0_0_60px_-10px_hsl(var(--accent)/0.7)] group w-full sm:w-auto whitespace-normal"
            >
              Construir meu Plano Perfeito
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 shrink-0" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollDown}
              className="bg-transparent border-white/20 text-white hover:bg-white/5 hover:text-white text-base px-8 py-6 h-auto w-full sm:w-auto"
            >
              Ver como funciona
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-sm text-white/40 font-medium mb-16"
          >
            Gratuito · 3 minutos · Sem cartão
          </motion.p>

          {/* 3 Pillars */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto"
          >
            {pillars.map((p, i) => (
              <motion.div
                key={p.label}
                whileHover={{ y: -4, borderColor: 'hsl(var(--accent) / 0.5)' }}
                className="glass-card rounded-2xl p-6 text-left border border-white/10 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                    <p.icon className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-xs uppercase tracking-wider text-white/40 font-semibold">
                    Passo {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1 break-words">{p.label}</h3>
                <p className="text-sm text-white/60 break-words">{p.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.button
        onClick={scrollDown}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1.2, duration: 0.6 }, y: { duration: 2, repeat: Infinity } }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 hover:text-white/80 transition-colors"
        aria-label="Rolar para baixo"
      >
        <span className="text-xs uppercase tracking-wider">Calcule o valor atual</span>
        <ChevronDown className="w-5 h-5" />
      </motion.button>
    </section>
  );
};
