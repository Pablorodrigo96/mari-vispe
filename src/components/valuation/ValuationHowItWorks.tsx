import { ClipboardList, BarChart3, Stethoscope, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    number: '01',
    icon: ClipboardList,
    title: 'Preencha os dados',
    description: 'Informações básicas da sua empresa: setor, receita, lucro e EBITDA. Leva apenas 5 minutos.',
    time: '5 min',
  },
  {
    number: '02',
    icon: BarChart3,
    title: 'Receba seu valor',
    description: 'Cálculo instantâneo usando 3 metodologias de mercado com dados de +500 transações reais.',
    time: 'Instantâneo',
  },
  {
    number: '03',
    icon: Stethoscope,
    title: 'Diagnostique e potencialize',
    description: 'Descubra quanto sua empresa pode valer após ajustes com nosso diagnóstico exclusivo.',
    time: 'Gratuito',
  },
];

export const ValuationHowItWorks = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Como funciona?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Em 3 passos simples você descobre o valor real da sua empresa.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-border" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                className="relative text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.15 }}
              >
                <div className="relative z-10 w-16 h-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center mx-auto mb-6 shadow-gold">
                  <span className="text-xl font-bold">{step.number}</span>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{step.description}</p>
                  <span className="inline-block text-xs font-medium text-accent bg-accent/10 px-3 py-1 rounded-full">
                    {step.time}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div className="md:hidden flex justify-center my-4">
                    <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
