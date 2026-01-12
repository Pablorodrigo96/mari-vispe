import { CheckCircle, Shield, TrendingUp, Users } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import SellWizard from '@/components/sell/SellWizard';

const benefits = [
  {
    icon: Users,
    title: 'Compradores Qualificados',
    description: 'Acesso a uma rede de investidores e empresários verificados',
  },
  {
    icon: Shield,
    title: 'Confidencialidade Total',
    description: 'Seus dados só são compartilhados após assinatura de NDA',
  },
  {
    icon: TrendingUp,
    title: 'Avaliação Gratuita',
    description: 'Receba uma estimativa de valor baseada em dados de mercado',
  },
  {
    icon: CheckCircle,
    title: 'Suporte Especializado',
    description: 'Assessoria durante todo o processo de venda',
  },
];

const Sell = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Venda sua empresa para{' '}
              <span className="text-gold">compradores qualificados</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Anuncie gratuitamente e conecte-se com investidores e empresários
              interessados no seu negócio. Processo seguro e confidencial.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border hover:border-gold/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wizard Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <SellWizard />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Sell;
