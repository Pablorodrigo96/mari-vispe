import { ArrowRight, CheckCircle, Shield, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { HowItWorks } from '@/components/sell/HowItWorks';
import { PlansPreview } from '@/components/sell/PlansPreview';
import { Testimonials } from '@/components/sell/Testimonials';
import { FinalCTA } from '@/components/sell/FinalCTA';

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

const stats = [
  { value: '+500', label: 'Empresas vendidas' },
  { value: 'R$ 2bi', label: 'Em transações' },
  { value: '45 dias', label: 'Tempo médio de venda' },
  { value: '98%', label: 'Satisfação' },
];

const Sell = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Venda sua empresa para{' '}
              <span className="text-gold">compradores qualificados</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Anuncie gratuitamente e conecte-se com investidores e empresários
              interessados no seu negócio. Processo seguro e confidencial.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                asChild
                size="lg"
                className="bg-gold hover:bg-gold/90 text-gold-foreground text-lg px-8"
              >
                <Link to="/auth/register">
                  Criar Conta Grátis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/auth/login">Já tenho conta</Link>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Sem cartão de crédito • Cancele quando quiser
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-gold">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Benefits Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Por Que Vender Conosco?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Oferecemos as melhores condições para você vender sua empresa com
              segurança e tranquilidade.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Testimonials */}
      <Testimonials />

      {/* Plans Preview */}
      <PlansPreview />

      {/* Final CTA */}
      <FinalCTA />

      <Footer />
    </div>
  );
};

export default Sell;
