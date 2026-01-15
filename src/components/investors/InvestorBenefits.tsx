import { ShieldCheck, TrendingUp, Users, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const benefits = [
  {
    icon: ShieldCheck,
    title: 'Due Diligence Completa',
    description: 'Todas as empresas passam por verificação rigorosa de documentos, financeiros e operacional.',
  },
  {
    icon: TrendingUp,
    title: 'Retornos Atrativos',
    description: 'Múltiplos de 3-5x em operações selecionadas com histórico comprovado de crescimento.',
  },
  {
    icon: Users,
    title: 'Deal Flow Curado',
    description: 'Acesso antecipado às melhores oportunidades antes de chegarem ao mercado.',
  },
  {
    icon: Lock,
    title: 'Confidencialidade',
    description: 'Negociações protegidas por NDA. Seus dados e interesses são tratados com sigilo absoluto.',
  },
];

export function InvestorBenefits() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Por que investir com a DealFlow?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Oferecemos uma experiência completa para investidores que buscam oportunidades reais de crescimento.
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <Card 
              key={index} 
              className="bg-card border-border hover:border-accent/30 transition-all duration-300 group"
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <benefit.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
