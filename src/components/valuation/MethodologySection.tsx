import { TrendingUp, Calculator, BarChart3 } from 'lucide-react';

const methodologies = [
  {
    icon: TrendingUp,
    title: 'EV/Receita',
    description: 'Valuation baseado em múltiplos de receita do seu setor no mercado brasileiro.',
  },
  {
    icon: Calculator,
    title: 'EV/EBITDA',
    description: 'Múltiplo sobre o lucro operacional antes de depreciação e amortização.',
  },
  {
    icon: BarChart3,
    title: 'Preço/Lucro (P/L)',
    description: 'Relação entre valor de mercado e lucro líquido da empresa.',
  },
];

export const MethodologySection = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Três metodologias, um resultado preciso
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
            Utilizamos múltiplos de mercado baseados em transações reais do mercado brasileiro 
            (2024/2025) para estimar o valor da sua empresa com precisão.
          </p>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-accent bg-accent/10 px-4 py-1.5 rounded-full">
            📊 Baseado em +500 transações reais do mercado brasileiro
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {methodologies.map((method, index) => {
            const Icon = method.icon;
            return (
              <div
                key={index}
                className="bg-card border border-border rounded-xl p-6 text-center hover:border-accent/30 transition-colors"
              >
                <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {method.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {method.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-card border border-border rounded-xl p-6 max-w-3xl mx-auto">
          <h3 className="font-semibold text-foreground mb-3 text-center">
            Como funciona o "Mashup Value"?
          </h3>
          <p className="text-sm text-muted-foreground text-center">
            O Mashup Value é calculado como a <strong>média dos três métodos</strong> de valuation. 
            Isso proporciona uma estimativa mais equilibrada, combinando diferentes perspectivas 
            de valor: crescimento (Receita), rentabilidade operacional (EBITDA) e resultado final (Lucro).
          </p>
        </div>
      </div>
    </section>
  );
};
