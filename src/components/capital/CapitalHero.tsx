import { Clock, BadgeCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { formatFullCurrency } from '@/lib/formatters';
import { ParticlesBackground } from '@/components/ui/particles-background';
import { motion } from 'framer-motion';
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
      {/* Dark Background */}
      <div className="absolute inset-0 gradient-navy-deep" />
      <div className="absolute inset-0 bg-grid-pattern" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsla(38,92%,50%,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_70%,hsla(38,92%,50%,0.06),transparent_40%)]" />
      <ParticlesBackground variant="dark" />
      
      <div className="container relative mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Text Content */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Crédito e Investimento para PMEs
            </div>
            
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight">
              Ajudamos sua empresa a{' '}
              <span className="text-gradient-gold">crescer</span>
            </h1>
            
            <p className="text-xl text-white font-medium">
              Crédito e Investimento sem burocracia.
            </p>
            
            <p className="text-lg text-white/60 max-w-xl">
              Conectamos seu negócio aos principais bancos, fundos de crédito e investidores anjo do Brasil.
            </p>
            
            {/* Trust badges */}
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2 text-white/60">
                <BadgeCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-sm">Taxas competitivas</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Clock className="w-5 h-5 text-accent" />
                <span className="text-sm">Análise em 48h</span>
              </div>
            </div>
          </motion.div>
          
          {/* Right - Simulator Card */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-accent/5 rounded-3xl blur-3xl" />
            <Card className="relative glass-card border-white/10">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-white mb-6">
                  De quanto você precisa?
                </h3>
                
                {/* Amount Display */}
                <div className="text-center mb-8">
                  <span className="text-4xl lg:text-5xl font-bold text-gradient-gold">
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
                  <div className="flex justify-between mt-2 text-sm text-white/40">
                    <span>R$ 10 mil</span>
                    <span>R$ 5 milhões</span>
                  </div>
                </div>
                
                {/* Microcopy */}
                <div className="flex justify-center gap-6 mb-6">
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    Taxas a partir de 1,5% a.m.
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/50">
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
                
                <p className="text-center text-xs text-white/40 mt-4">
                  Sem compromisso • Resposta em até 48 horas
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
