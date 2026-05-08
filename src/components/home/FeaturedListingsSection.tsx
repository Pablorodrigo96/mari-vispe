import { Link } from 'react-router-dom';
import { ArrowRight, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { BusinessCardSkeleton } from '@/components/marketplace/BusinessCardSkeleton';
import { supabase } from '@/integrations/supabase/client';

export default function FeaturedListingsSection() {
  const { data: featuredListings, isLoading } = useQuery({
    queryKey: ['featured-listings-master'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_listings')
        .select('*')
        .eq('plan', 'master')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
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
            Array.from({ length: 4 }).map((_, i) => <BusinessCardSkeleton key={i} />)
          ) : featuredListings && featuredListings.length > 0 ? (
            featuredListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)
          ) : (
            <div className="col-span-full text-center py-12">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">Seja o primeiro destaque!</h3>
              <p className="text-muted-foreground mb-4">Anuncie sua empresa com o plano Master e apareça aqui.</p>
              <Button asChild variant="default"><Link to="/vender">Anunciar Agora</Link></Button>
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
  );
}
