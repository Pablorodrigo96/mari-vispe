import { Search, MousePointerClick, Eye } from 'lucide-react';

const steps = [
  { icon: Search, label: 'Digite o nome da sua empresa' },
  { icon: MousePointerClick, label: 'Selecione a empresa correta' },
  { icon: Eye, label: 'Veja as oportunidades para você' },
];

export function MatchingHero() {
  return (
    <section className="relative pt-32 pb-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
            <Search className="w-4 h-4" />
            Matching Inteligente
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Sua empresa já está{' '}
            <span className="text-accent">em nosso radar</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Com o buscador inteligente da PME.B3, encontramos oportunidades de negócios compatíveis com a sua empresa. Digite o nome da sua empresa abaixo, selecione a correta e veja as oportunidades esperando por você.
          </p>

          {/* Step indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent text-accent-foreground font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <span className="text-sm text-muted-foreground">{step.label}</span>
                {i < steps.length - 1 && (
                  <span className="hidden sm:block text-muted-foreground/40 text-xl ml-2">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
