import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Shield, Briefcase } from 'lucide-react';

export function InvestorsHero() {
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--gold)/0.1),transparent_50%)]" />
      
      <div className="container relative mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Text Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              Oportunidades Exclusivas de M&A
            </div>
            
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
              Invista em empresas com{' '}
              <span className="text-accent">potencial real</span> de crescimento
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-xl">
              Acesse oportunidades exclusivas de M&A e participe de rodadas de investimento curadas por especialistas.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold">
                <Link to="/marketplace">
                  Ver Oportunidades
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/capital">
                  Quero Captar Recursos
                </Link>
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-border">
              <div>
                <p className="text-3xl font-bold text-accent">R$ 50M+</p>
                <p className="text-sm text-muted-foreground">em deals intermediados</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">200+</p>
                <p className="text-sm text-muted-foreground">investidores ativos</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">95%</p>
                <p className="text-sm text-muted-foreground">taxa de satisfação</p>
              </div>
            </div>
          </div>
          
          {/* Right - Visual Element */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 rounded-3xl blur-3xl" />
            <div className="relative bg-card border border-border rounded-2xl p-8 shadow-card">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Due Diligence Completa</p>
                    <p className="text-sm text-muted-foreground">Empresas verificadas</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Retornos de 3-5x</p>
                    <p className="text-sm text-muted-foreground">Em operações selecionadas</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Deal Flow Curado</p>
                    <p className="text-sm text-muted-foreground">Acesso antecipado</p>
                  </div>
                </div>
                
                {/* Sample Deal Card */}
                <div className="mt-8 p-4 bg-muted/50 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded">
                      Nova Oportunidade
                    </span>
                    <span className="text-xs text-muted-foreground">Há 2 dias</span>
                  </div>
                  <p className="font-semibold text-foreground">E-commerce de Moda</p>
                  <p className="text-sm text-muted-foreground mb-2">Faturamento: R$ 2.4M/ano</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-accent">R$ 1.2M</span>
                    <span className="text-xs text-success">+45% margem</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
