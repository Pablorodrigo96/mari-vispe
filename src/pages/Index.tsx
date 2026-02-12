import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Users, Building2, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SearchBar } from '@/components/home/SearchBar';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { BusinessCardSkeleton } from '@/components/marketplace/BusinessCardSkeleton';
import { stats, categories } from '@/data/mockData';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { data: featuredListings, isLoading } = useQuery({
    queryKey: ['featured-listings-master'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('plan', 'master')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section - Dark Corporate */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 gradient-navy-deep bg-grid-pattern overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsla(38,92%,50%,0.06)_0%,_transparent_70%)]" />
        
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-12 animate-fade-in">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
              A plataforma líder em{' '}
              <span className="text-accent">negociação de empresas</span>{' '}
              do Brasil
            </h1>
            <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto">
              Conectamos compradores, vendedores e investidores em um ambiente seguro e transparente para transações de M&A.
            </p>
          </div>

          {/* Search Bar */}
          <div className="animate-fade-in-up">
            <SearchBar />
          </div>

          {/* Stats - Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-14 max-w-4xl mx-auto">
            {[
              { icon: Building2, label: 'Empresas Listadas', value: formatNumber(stats.totalListings) },
              { icon: TrendingUp, label: 'Transações Fechadas', value: formatNumber(stats.totalTransactions) },
              { icon: Users, label: 'Volume Negociado', value: formatCurrency(stats.totalVolume) },
              { icon: Clock, label: 'Dias Médio de Venda', value: `${stats.averageTime} dias` },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-xl p-5 text-center animate-count-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent/15 mb-3">
                  <stat.icon className="h-5 w-5 text-accent" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/50 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Explore por Setor</h2>
            <div className="w-12 h-1 bg-accent mx-auto rounded-full mt-3 mb-3" />
            <p className="text-muted-foreground">Encontre oportunidades no segmento ideal para você</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/marketplace?sector=${cat.id}`}
                className="group relative rounded-xl overflow-hidden shadow-card h-40 md:h-48"
              >
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-semibold text-white text-sm md:text-base">{cat.label}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Oportunidades em Destaque</h2>
              <div className="w-12 h-1 bg-accent rounded-full mt-1" />
              <p className="text-muted-foreground mt-3">Negócios verificados e com alto potencial</p>
            </div>
            <Button asChild variant="outline" className="hidden md:flex">
              <Link to="/marketplace">
                Ver Todos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <BusinessCardSkeleton key={i} />
              ))
            ) : featuredListings && featuredListings.length > 0 ? (
              featuredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Seja o primeiro destaque!
                </h3>
                <p className="text-muted-foreground mb-4">
                  Anuncie sua empresa com o plano Master e apareça aqui.
                </p>
                <Button asChild variant="default">
                  <Link to="/vender">Anunciar Agora</Link>
                </Button>
              </div>
            )}
          </div>
          <div className="mt-8 text-center md:hidden">
            <Button asChild variant="outline">
              <Link to="/marketplace">Ver Todos <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 gradient-navy-deep bg-grid-pattern overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_hsla(38,92%,50%,0.08)_0%,_transparent_60%)]" />
        <div className="container mx-auto px-4 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">Pronto para vender sua empresa?</h2>
          <p className="text-white/50 mb-8 max-w-2xl mx-auto">
            Anuncie gratuitamente e alcance milhares de compradores e investidores qualificados.
          </p>
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold px-10 h-12 text-base">
            Anunciar Grátis
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
