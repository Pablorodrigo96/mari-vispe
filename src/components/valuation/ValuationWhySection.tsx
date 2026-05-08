import { Shield, TrendingUp, Target, Search, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const reasons = [
  {
    icon: Lock,
    title: 'Dados 100% sigilosos',
    description: 'Seus números financeiros são privados. Nenhum concorrente, sócio, funcionário ou banco tem acesso sem o seu consentimento.',
    highlight: 'Sigilo absoluto',
  },
  {
    icon: Shield,
    title: 'Negocie com poder',
    description: 'Saiba exatamente o valor da sua empresa para não aceitar ofertas abaixo do justo. Dados concretos são sua melhor arma numa negociação.',
    highlight: 'Evite perder até 50% do valor',
  },
  {
    icon: TrendingUp,
    title: 'Atraia investidores',
    description: 'Laudo profissional baseado em metodologias reconhecidas pelo mercado. Fundos e compradores exigem valuation para iniciar conversas.',
    highlight: 'Credibilidade instantânea',
  },
  {
    icon: Target,
    title: 'Planeje sua saída',
    description: 'Tenha clareza sobre o momento certo de vender ou buscar sócios. Com dados reais, você toma decisões estratégicas — não emocionais.',
    highlight: 'Timing é tudo em M&A',
  },
  {
    icon: Search,
    title: 'Identifique gaps',
    description: 'Descubra o que está destruindo valor na sua empresa com nosso diagnóstico exclusivo. Corrija antes de ir ao mercado e maximize seu retorno.',
    highlight: 'Diagnóstico gratuito incluso',
  },
];

export const ValuationWhySection = () => {
  return (
    <section className="py-14 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Por que fazer um Valuation?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Empresários que conhecem o valor do seu negócio fecham negociações{' '}
            <span className="text-accent font-semibold">até 78% mais vantajosas.</span>
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <motion.div
                key={index}
                className="group bg-card border border-border rounded-2xl p-6 hover:border-accent/30 transition-all hover:shadow-lg"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <Icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{reason.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{reason.description}</p>
                <span className="inline-block text-xs font-medium text-accent bg-accent/10 px-3 py-1 rounded-full">
                  {reason.highlight}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
