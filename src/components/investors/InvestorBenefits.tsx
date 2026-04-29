import { ShieldCheck, TrendingUp, Users, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

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
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Por que investir com a mari?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Oferecemos uma experiência completa para investidores que buscam oportunidades reais de crescimento.
          </p>
        </motion.div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="bg-card border-border hover:border-accent/30 hover:shadow-gold transition-all duration-300 group h-full">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
