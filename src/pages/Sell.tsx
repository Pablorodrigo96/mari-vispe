import { ArrowRight, CheckCircle, Shield, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { PublicFooter as Footer } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { HowItWorks } from '@/components/sell/HowItWorks';
import { PlansPreview } from '@/components/sell/PlansPreview';
import { Testimonials } from '@/components/sell/Testimonials';
import { FinalCTA } from '@/components/sell/FinalCTA';
import { ParticlesBackground } from '@/components/ui/particles-background';
import { motion } from 'framer-motion';

const benefits = [
  {
    icon: Shield,
    title: 'Sigilo Absoluto',
    description: 'Nenhum concorrente, sócio ou funcionário sabe que você está vendendo. Sua empresa aparece com codinome — identidade só revelada após NDA e sua aprovação.',
  },
  {
    icon: Users,
    title: 'Compradores Qualificados',
    description: 'Acesso a uma rede de investidores e empresários verificados',
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

      {/* Hero Section - Dark */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 gradient-navy-deep" />
        <div className="absolute inset-0 bg-grid-pattern" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsla(38,92%,50%,0.1),transparent_50%)]" />
        <ParticlesBackground variant="dark" />

        <motion.div 
          className="container relative mx-auto px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              100% Sigilosa · 100% Anônima
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Sua empresa pode valer{' '}
              <span className="text-gradient-gold">mais do que você imagina.</span>
            </h1>
            <p className="text-lg text-white/60 mb-4">
              Anuncie gratuitamente, descubra o valor da sua empresa com IA e conecte-se
              com compradores qualificados.
            </p>
            <p className="text-base text-accent/90 font-medium mb-8 max-w-2xl mx-auto">
              Nenhum concorrente, sócio ou funcionário vai saber que você está vendendo. Processo 100% anônimo, com codinome e NDA obrigatório.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                asChild
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold text-lg px-8"
              >
                <Link to="/auth?tab=signup&redirect=/vender&role=seller">
                  Criar Conta Grátis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
                <Link to="/auth?tab=login&redirect=/vender">Já tenho conta</Link>
              </Button>
            </div>

            <p className="text-sm text-white/40">
              Sem cartão de crédito • Cancele quando quiser
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div 
                key={index} 
                className="text-center glass-card rounded-xl p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              >
                <p className="text-2xl sm:text-3xl font-bold text-gradient-gold">
                  {stat.value}
                </p>
                <p className="text-sm text-white/50">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Benefits Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Por Que Vender Conosco?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Oferecemos as melhores condições para você vender sua empresa com
              segurança e tranquilidade.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border hover:border-accent/30 hover:shadow-gold transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </motion.div>
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
