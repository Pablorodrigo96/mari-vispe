import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Shield, Briefcase } from 'lucide-react';
import { ParticlesBackground } from '@/components/ui/particles-background';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export function InvestorsHero() {
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Dark Background */}
      <div className="absolute inset-0 gradient-navy-deep" />
      <div className="absolute inset-0 bg-grid-pattern" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsla(38,92%,50%,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsla(38,92%,50%,0.06),transparent_40%)]" />
      <ParticlesBackground variant="dark" />
      
      <motion.div 
        className="container relative mx-auto px-4 lg:px-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Text Content */}
          <div className="space-y-8">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Oportunidades Exclusivas de M&A
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight">
              Invista em empresas com{' '}
              <span className="text-gradient-gold">potencial real</span> de crescimento
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl text-white/70 max-w-xl">
              Acesse oportunidades exclusivas de M&A e participe de rodadas de investimento curadas por especialistas.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold">
                <Link to="/marketplace">
                  Ver Oportunidades
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
                <Link to="/capital">
                  Quero Captar Recursos
                </Link>
              </Button>
            </motion.div>
            
            {/* Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10">
              <div>
                <p className="text-3xl font-bold text-gradient-gold">R$ 50M+</p>
                <p className="text-sm text-white/50">em deals intermediados</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">200+</p>
                <p className="text-sm text-white/50">investidores ativos</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">95%</p>
                <p className="text-sm text-white/50">taxa de satisfação</p>
              </div>
            </motion.div>
          </div>
          
          {/* Right - Visual Element */}
          <motion.div variants={itemVariants} className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-accent/5 rounded-3xl blur-3xl" />
            <div className="relative glass-card rounded-2xl p-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Due Diligence Completa</p>
                    <p className="text-sm text-white/50">Empresas verificadas</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Retornos de 3-5x</p>
                    <p className="text-sm text-white/50">Em operações selecionadas</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Deal Flow Curado</p>
                    <p className="text-sm text-white/50">Acesso antecipado</p>
                  </div>
                </div>
                
                {/* Sample Deal Card */}
                <div className="mt-8 p-4 glass-card rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded">
                      Nova Oportunidade
                    </span>
                    <span className="text-xs text-white/40">Há 2 dias</span>
                  </div>
                  <p className="font-semibold text-white">E-commerce de Moda</p>
                  <p className="text-sm text-white/50 mb-2">Faturamento: R$ 2.4M/ano</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gradient-gold">R$ 1.2M</span>
                    <span className="text-xs text-emerald-400">+45% margem</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
