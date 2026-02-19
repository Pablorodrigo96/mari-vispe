import { Search, MousePointerClick, Eye, Brain, Cpu, Network } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  { icon: Search, label: 'Digite o nome da sua empresa', techIcon: Cpu },
  { icon: MousePointerClick, label: 'Selecione a empresa correta', techIcon: Network },
  { icon: Eye, label: 'Veja as oportunidades para você', techIcon: Brain },
];

export function MatchingHero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden gradient-navy-deep bg-grid-pattern">
      {/* Radial glows */}
      <div className="absolute top-10 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/[0.03] rounded-full blur-[80px]" />

      {/* Floating dots */}
      <div className="absolute top-20 left-[15%] w-1.5 h-1.5 rounded-full bg-accent/40 animate-float" />
      <div className="absolute top-40 right-[20%] w-1 h-1 rounded-full bg-accent/30 animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-20 left-[30%] w-2 h-2 rounded-full bg-accent/20 animate-float" style={{ animationDelay: '4s' }} />
      <div className="absolute top-32 right-[35%] w-1 h-1 rounded-full bg-accent/25 animate-float" style={{ animationDelay: '1s' }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-accent text-sm font-medium mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <Brain className="w-4 h-4" />
            Powered by AI · Matching Inteligente
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight"
          >
            Sua empresa já está{' '}
            <span className="text-gradient-gold">em nosso radar</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-primary-foreground/60 mb-12 max-w-2xl mx-auto"
          >
            Com o buscador inteligente da PME.B3, encontramos oportunidades de negócios compatíveis com a sua empresa. Digite o nome, selecione a correta e veja as oportunidades esperando por você.
          </motion.p>

          {/* Step indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
                className="flex items-center gap-3"
              >
                <div className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full gradient-gold text-navy font-bold text-sm shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-sm text-primary-foreground/80 pr-1">{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <motion.span
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.3, delay: 0.7 + i * 0.15 }}
                    className="hidden sm:block text-accent/60 text-xl"
                  >
                    →
                  </motion.span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
