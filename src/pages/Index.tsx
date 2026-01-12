import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Users, Building2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SearchBar } from '@/components/home/SearchBar';
import { BusinessCard } from '@/components/marketplace/BusinessCard';
import { mockBusinesses, stats, categories } from '@/data/mockData';
import { formatCurrency, formatNumber } from '@/lib/formatters';

const Index = () => {
  const featuredBusinesses = mockBusinesses.slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-4xl mx-auto mb-10 animate-fade-in">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              A plataforma líder em{' '}
              <span className="text-accent">negociação de empresas</span>{' '}
              do Brasil
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Conectamos compradores, vendedores e investidores em um ambiente seguro e transparente para transações de M&A.
            </p>
          </div>

          {/* Search Bar */}
          <div className="animate-fade-in-up">
            <SearchBar />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mt-12 max-w-4xl mx-auto">
            {[
              { icon: Building2, label: 'Empresas Listadas', value: formatNumber(stats.totalListings) },
              { icon: TrendingUp, label: 'Transações Fechadas', value: formatNumber(stats.totalTransactions) },
              { icon: Users, label: 'Volume Negociado', value: formatCurrency(stats.totalVolume) },
              { icon: Clock, label: 'Dias Médio de Venda', value: `${stats.averageTime} dias` },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 animate-count-up" style={{ animationDelay: `${i * 100}ms` }}>
                <stat.icon className="h-6 w-6 mx-auto mb-2 text-accent" />
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Explore por Setor</h2>
            <p className="text-muted-foreground">Encontre oportunidades no segmento ideal para você</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/marketplace?sector=${cat.id}`}
                className="group p-6 bg-card rounded-xl border border-border hover:border-accent hover:shadow-soft transition-all text-center"
              >
                <span className="text-4xl mb-3 block">{cat.icon}</span>
                <h3 className="font-medium text-foreground group-hover:text-accent transition-colors">{cat.label}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Oportunidades em Destaque</h2>
              <p className="text-muted-foreground">Negócios verificados e com alto potencial</p>
            </div>
            <Button asChild variant="outline" className="hidden md:flex">
              <Link to="/marketplace">
                Ver Todos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredBusinesses.map((business) => (
              <BusinessCard key={business.id} business={business} featured />
            ))}
          </div>
          <div className="mt-8 text-center md:hidden">
            <Button asChild variant="outline">
              <Link to="/marketplace">Ver Todos <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">Pronto para vender sua empresa?</h2>
          <p className="text-primary-foreground/70 mb-8 max-w-2xl mx-auto">
            Anuncie gratuitamente e alcance milhares de compradores e investidores qualificados.
          </p>
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold">
            Anunciar Grátis
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
