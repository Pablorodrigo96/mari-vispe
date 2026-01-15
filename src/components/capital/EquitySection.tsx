import { Banknote, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { CapitalObjective } from '@/pages/Capital';

interface EquitySectionProps {
  onOpenModal: (obj?: CapitalObjective) => void;
}

export function EquitySection({ onOpenModal }: EquitySectionProps) {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Busca um Sócio ou Investidor Anjo?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Escolha a modalidade que melhor atende às necessidades do seu negócio.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Debt Card */}
          <Card className="bg-card border-border hover:border-accent/30 transition-all duration-300 group overflow-hidden">
            <CardContent className="p-8">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Banknote className="w-8 h-8 text-accent" />
              </div>
              
              <h3 className="text-2xl font-bold text-foreground mb-3">
                Crédito / Empréstimo
              </h3>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Para quem busca capital de giro ou expansão{' '}
                <span className="text-foreground font-medium">sem diluir participação</span>. 
                Pague juros mensais e mantenha 100% do seu negócio.
              </p>
              
              <ul className="space-y-2 mb-8">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Taxas a partir de 1,5% a.m.
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Prazo de 12 a 60 meses
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Aprovação em até 48h
                </li>
              </ul>
              
              <Button 
                onClick={() => onOpenModal('giro')}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold group/btn"
              >
                Simular Empréstimo
                <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
          
          {/* Equity Card */}
          <Card className="bg-card border-border hover:border-success/30 transition-all duration-300 group overflow-hidden">
            <CardContent className="p-8">
              <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mb-6 group-hover:bg-success/20 transition-colors">
                <Users className="w-8 h-8 text-success" />
              </div>
              
              <h3 className="text-2xl font-bold text-foreground mb-3">
                Investidor / Sócio
              </h3>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Para quem busca{' '}
                <span className="text-foreground font-medium">"Smart Money"</span>, 
                sócios estratégicos e não quer pagar juros mensais.
              </p>
              
              <ul className="space-y-2 mb-8">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Rede de 200+ investidores
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Mentoria e networking inclusos
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Sem pagamento mensal
                </li>
              </ul>
              
              <Button 
                onClick={() => onOpenModal('socio')}
                variant="outline"
                className="w-full border-success text-success hover:bg-success/10 group/btn"
              >
                Encontrar Investidor
                <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
