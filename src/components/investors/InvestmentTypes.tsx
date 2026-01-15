import { Link } from 'react-router-dom';
import { Building2, PieChart, Rocket, Handshake, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const investmentTypes = [
  {
    icon: Building2,
    title: 'Aquisição Integral',
    description: 'Compre 100% de uma empresa operacional e assuma o controle total do negócio.',
    ticket: 'A partir de R$ 500k',
    link: '/marketplace',
  },
  {
    icon: PieChart,
    title: 'Participação Minoritária',
    description: 'Invista em uma fatia do negócio mantendo o fundador no comando operacional.',
    ticket: 'A partir de R$ 100k',
    link: '/marketplace',
  },
  {
    icon: Rocket,
    title: 'Investimento Anjo',
    description: 'Apoie startups em estágio inicial com capital e mentoria estratégica.',
    ticket: 'A partir de R$ 50k',
    link: '/capital',
  },
  {
    icon: Handshake,
    title: 'Fusão / Joint Venture',
    description: 'Una forças com outras empresas para criar sinergias e expandir mercados.',
    ticket: 'Sob consulta',
    link: '/marketplace',
  },
];

export function InvestmentTypes() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Tipos de Investimento
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Escolha a modalidade que melhor se encaixa no seu perfil e objetivos de investimento.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {investmentTypes.map((type, index) => (
            <Card 
              key={index} 
              className="bg-card border-border hover:border-accent/30 transition-all duration-300 group overflow-hidden"
            >
              <CardContent className="p-6 lg:p-8">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                    <type.icon className="w-7 h-7 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {type.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 leading-relaxed">
                      {type.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-accent">
                        {type.ticket}
                      </span>
                      <Button asChild variant="ghost" size="sm" className="group/btn">
                        <Link to={type.link}>
                          Ver oportunidades
                          <ArrowRight className="ml-1 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
