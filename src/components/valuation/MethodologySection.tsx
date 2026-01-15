import { BarChart3, Calculator, TrendingUp } from 'lucide-react';

const methodologies = [
  {
    icon: BarChart3,
    title: 'EV/Receita',
    description: 'Valuation baseado em múltiplos de receita do seu setor.',
  },
  {
    icon: Calculator,
    title: 'EV/EBITDA',
    description: 'Múltiplo sobre o lucro operacional antes de depreciação.',
  },
  {
    icon: TrendingUp,
    title: 'Preço/Lucro (P/L)',
    description: 'Relação entre valor de mercado e lucro líquido.',
  },
];

export const MethodologySection = () => {
  return (
    <section id="metodologia" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Metodologia de Avaliação
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Utilizamos múltiplos de mercado baseados em transações reais do mercado brasileiro (2024/2025) para estimar o valor da sua empresa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {methodologies.map((method, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-8 rounded-xl bg-card border border-border hover:border-gold/30 transition-colors shadow-card"
            >
              <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mb-5">
                <method.icon className="w-7 h-7 text-gold" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-3">
                {method.title}
              </h3>
              <p className="text-muted-foreground">
                {method.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
