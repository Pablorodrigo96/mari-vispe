import { Clock, BadgeCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { formatFullCurrency } from '@/lib/formatters';
import type { CapitalObjective } from '@/pages/Capital';

interface CapitalHeroProps {
  onRequestProposal: (obj?: CapitalObjective, amount?: number) => void;
  selectedAmount: number;
  setSelectedAmount: (amount: number) => void;
}

export function CapitalHero({ onRequestProposal, selectedAmount, setSelectedAmount }: CapitalHeroProps) {
  const minAmount = 10000;
  const maxAmount = 5000000;
  
  const handleSliderChange = (value: number[]) => {
    setSelectedAmount(value[0]);
  };

  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--gold)/0.1),transparent_50%)]" />
      
      <div className="container relative mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Text Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              Crédito e Investimento para PMEs
            </div>
            
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
              Ajudamos sua empresa a{' '}
              <span className="text-accent">crescer</span>
            </h1>
            
            <p className="text-xl text-foreground font-medium">
              Crédito e Investimento sem burocracia.
            </p>
            
            <p className="text-lg text-muted-foreground max-w-xl">
              Conectamos seu negócio aos principais bancos, fundos de crédito e investidores anjo do Brasil.
            </p>
            
            {/* Trust badges */}
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BadgeCheck className="w-5 h-5 text-success" />
                <span className="text-sm">Taxas competitivas</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5 text-accent" />
                <span className="text-sm">Análise em 48h</span>
              </div>
            </div>
          </div>
          
          {/* Right - Simulator Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 rounded-3xl blur-3xl" />
            <Card className="relative bg-card border-border shadow-card">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-foreground mb-6">
                  De quanto você precisa?
                </h3>
                
                {/* Amount Display */}
                <div className="text-center mb-8">
                  <span className="text-4xl lg:text-5xl font-bold text-accent">
                    {formatFullCurrency(selectedAmount)}
                  </span>
                </div>
                
                {/* Slider */}
                <div className="mb-8">
                  <Slider
                    value={[selectedAmount]}
                    onValueChange={handleSliderChange}
                    min={minAmount}
                    max={maxAmount}
                    step={10000}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span>R$ 10 mil</span>
                    <span>R$ 5 milhões</span>
                  </div>
                </div>
                
                {/* Microcopy */}
                <div className="flex justify-center gap-6 mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    Taxas a partir de 1,5% a.m.
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    Sem garantia real
                  </div>
                </div>
                
                {/* CTA Button */}
                <Button 
                  onClick={() => onRequestProposal('giro', selectedAmount)}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold text-lg py-6"
                >
                  Solicitar Proposta
                </Button>
                
                <p className="text-center text-xs text-muted-foreground mt-4">
                  Sem compromisso • Resposta em até 48 horas
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
