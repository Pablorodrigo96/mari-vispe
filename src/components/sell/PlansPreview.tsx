import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Grátis',
    price: 'R$ 0',
    period: '/mês',
    description: 'Ideal para começar',
    features: [
      '1 anúncio ativo',
      'Fotos básicas',
      'Contato via plataforma',
      'Suporte por email',
    ],
    highlighted: false,
    cta: 'Começar Grátis',
  },
  {
    name: 'Standard',
    price: 'R$ 197',
    period: '/mês',
    description: 'Para vendedores sérios',
    features: [
      '5 anúncios ativos',
      'Fotos ilimitadas',
      'Destaque na busca',
      '5 Valuations DCF por mês',
      'Suporte prioritário',
    ],
    highlighted: true,
    cta: 'Escolher Standard',
  },
  {
    name: 'Premium',
    price: 'R$ 497',
    period: '/mês',
    description: 'Máxima visibilidade',
    features: [
      'Anúncios ilimitados',
      'Selo Verificado',
      'Topo dos resultados',
      'Valuations DCF ilimitados',
      'Assessoria dedicada',
      'Avaliação profissional',
    ],
    highlighted: false,
    cta: 'Escolher Premium',
  },
];

export const PlansPreview = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Planos para Cada Necessidade
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comece gratuitamente e faça upgrade quando precisar de mais recursos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-6 transition-all ${
                plan.highlighted
                  ? 'bg-card border-2 border-gold shadow-lg scale-105'
                  : 'bg-card border border-border'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gold text-gold-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Mais Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="font-semibold text-foreground text-lg mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center">
                  <span className="text-3xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-gold flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={plan.highlighted ? 'default' : 'outline'}
                className={`w-full ${
                  plan.highlighted
                    ? 'bg-gold hover:bg-gold/90 text-gold-foreground'
                    : ''
                }`}
              >
                <Link to="/auth/register">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
