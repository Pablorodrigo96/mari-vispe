import { ClipboardList, Search, Presentation, Wallet } from 'lucide-react';

const steps = [
  {
    icon: ClipboardList,
    step: '01',
    title: 'Solicitação',
    description: 'Informe o valor e os dados básicos da sua empresa.',
  },
  {
    icon: Search,
    step: '02',
    title: 'Análise de Crédito',
    description: 'Nossa IA e time cruzam seus dados com bancos e fundos.',
  },
  {
    icon: Presentation,
    step: '03',
    title: 'Rodada de Captação',
    description: 'Receba propostas de crédito ou apresente-se para investidores.',
  },
  {
    icon: Wallet,
    step: '04',
    title: 'Dinheiro em Conta',
    description: 'Capital liberado para impulsionar seu negócio.',
  },
];

export function CapitalHowItWorks() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Como funciona a captação com a mari?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Um processo simples e transparente do início ao fim.
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="relative bg-card border border-border rounded-xl p-6 hover:border-accent/30 transition-all duration-300 group"
            >
              {/* Connector line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-border group-hover:bg-accent/30 transition-colors" />
              )}
              
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <step.icon className="w-6 h-6 text-accent" />
              </div>
              
              <span className="text-xs font-bold text-accent uppercase tracking-wider">
                Passo {step.step}
              </span>
              
              <h3 className="text-lg font-semibold text-foreground mt-2 mb-2">
                {step.title}
              </h3>
              
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
