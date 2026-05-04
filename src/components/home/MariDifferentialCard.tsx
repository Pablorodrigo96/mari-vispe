import { motion } from 'framer-motion';
import { Brain, Target, ShieldAlert } from 'lucide-react';

const items = [
  {
    Icon: Target,
    title: 'Probabilidade + faixa',
    body: 'Para cada empresa, a mari devolve a chance de ser vendida nos próximos 12 meses e a faixa esperada de valor — não um número solto.',
  },
  {
    Icon: Brain,
    title: 'Razões explicáveis',
    body: 'Você vê quais variáveis pesaram (SHAP): receita, margem, idade, setor, momento. Sem caixa-preta.',
  },
  {
    Icon: ShieldAlert,
    title: 'Abstenção quando não sabe',
    body: 'Quando os dados não são suficientes, a mari avisa e se cala — em vez de inventar um número que parece bom.',
  },
];

export function MariDifferentialCard() {
  return (
    <section className="relative py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <p className="text-[10px] uppercase tracking-[0.4em] text-accent mb-4">o que a mari faz de diferente</p>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground text-balance">
            Não é busca. Não é planilha. É <span className="text-gradient-gold">previsão.</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            A mari analisa milhões de sinais de mercado e devolve probabilidade, faixa de valor e razões.
            Quando não sabe o suficiente, ela se abstém.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {items.map(({ Icon, title, body }, i) => (
            <motion.div
              key={title}
              className="rounded-2xl border border-border bg-card p-6 hover:border-accent/40 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
