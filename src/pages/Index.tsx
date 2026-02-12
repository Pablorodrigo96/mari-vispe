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
      
      {/* Hero Section */}
      <section className="relative pt-28 pb-24 md:pt-40 md:pb-36 gradient-navy-deep bg-grid-pattern overflow-hidden">
        {/* Asymmetric radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,_hsla(38,92%,50%,0.08)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,_hsla(222,47%,30%,0.15)_0%,_transparent_50%)]" />
        
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-14 animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-medium tracking-widest uppercase text-accent">Plataforma #1 de M&A no Brasil</span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight text-balance">
              A plataforma líder em{' '}
              <span className="text-gradient-gold">negociação de empresas</span>{' '}
              do Brasil
            </h1>
            <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
              Conectamos compradores, vendedores e investidores em um ambiente seguro e transparente para transações de M&A.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold h-12 px-8 text-base rounded-xl">
                <Link to="/marketplace">Explorar Marketplace</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 h-12 px-8 text-base rounded-xl bg-transparent">
                <Link to="/valuation">Avaliar Minha Empresa</Link>
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="animate-fade-in-up">
            <p className="text-center text-white/40 text-sm tracking-widest uppercase mb-4">Encontre o negócio ideal</p>
            <SearchBar />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-16 max-w-4xl mx-auto">
            {[
              { label: 'Empresas Listadas', value: formatNumber(stats.totalListings) },
              { label: 'Transações Fechadas', value: formatNumber(stats.totalTransactions) },
              { label: 'Volume Negociado', value: formatCurrency(stats.totalVolume) },
              { label: 'Dias Médio de Venda', value: `${stats.averageTime} dias` },
            ].map((stat, i) => (
              <div
                key={i}
                className="glass-card rounded-xl p-5 text-center group hover:border-accent/30 transition-all duration-300 animate-count-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <p className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tight">{stat.value}</p>
                <div className="w-8 h-px bg-accent/40 mx-auto my-2" />
                <p className="text-xs text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Explore por Setor</h2>
            <div className="w-12 h-1 bg-accent mx-auto rounded-full mt-3 mb-3" />
            <p className="text-muted-foreground">Encontre oportunidades no segmento ideal para você</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/marketplace?sector=${cat.id}`}
                className="group relative rounded-xl overflow-hidden shadow-card h-44 md:h-56"
              >
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                  <h3 className="font-semibold text-white text-sm md:text-base">{cat.label}</h3>
                  <ArrowRight className="h-4 w-4 text-white/0 group-hover:text-white/80 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-start justify-between mb-12">
            <div className="flex gap-4">
              <div className="w-1 h-16 bg-accent rounded-full hidden md:block" />
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Oportunidades em Destaque</h2>
                <p className="text-muted-foreground tracking-wide">Negócios verificados e com alto potencial</p>
              </div>
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
      <section className="relative py-24 md:py-32 gradient-navy-deep bg-grid-pattern overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_hsla(38,92%,50%,0.08)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsla(222,47%,30%,0.12)_0%,_transparent_50%)]" />
        <div className="container mx-auto px-4 lg:px-8 text-center relative z-10">
          {/* Social proof */}
          <p className="text-white/40 text-sm italic mb-6 max-w-lg mx-auto">
            "A PME.B3 nos conectou com o comprador ideal em menos de 60 dias. Processo transparente e profissional."
          </p>
          <p className="text-accent text-xs font-medium tracking-widest uppercase mb-8">— Carlos M., Empresário</p>
          
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 text-balance">Pronto para vender sua empresa?</h2>
          <p className="text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed">
            Anuncie gratuitamente e alcance milhares de compradores e investidores qualificados.
          </p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold px-12 h-14 text-lg rounded-xl">
            <Link to="/vender">Anunciar Grátis</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
