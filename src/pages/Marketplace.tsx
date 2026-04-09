import { useState, useEffect } from 'react';
import { Grid, List, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { BusinessCardSkeleton } from '@/components/marketplace/BusinessCardSkeleton';
import { FilterSidebar, FilterState, defaultFilters } from '@/components/marketplace/FilterSidebar';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'public_listings'>;

const Marketplace = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('recent');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('public_listings')
        .select('*')
        .eq('status', 'active');

      // Apply category filter
      if (filters.categories.length > 0) {
        query = query.in('category', filters.categories);
      }

      // Apply state filter
      if (filters.states.length > 0) {
        query = query.in('state', filters.states);
      }

      // Apply price range filter (only if not at default max)
      if (filters.priceRange[0] > 0) {
        query = query.gte('asking_price', filters.priceRange[0]);
      }
      if (filters.priceRange[1] < 10000000) {
        query = query.lte('asking_price', filters.priceRange[1]);
      }

      // Apply revenue range filter (only if not at default max)
      if (filters.revenueRange[0] > 0) {
        query = query.gte('annual_revenue', filters.revenueRange[0]);
      }
      if (filters.revenueRange[1] < 20000000) {
        query = query.lte('annual_revenue', filters.revenueRange[1]);
      }

      // Apply sorting
      switch (sortBy) {
        case 'price-asc':
          query = query.order('asking_price', { ascending: true, nullsFirst: false });
          break;
        case 'price-desc':
          query = query.order('asking_price', { ascending: false, nullsFirst: false });
          break;
        case 'revenue':
          query = query.order('annual_revenue', { ascending: false, nullsFirst: false });
          break;
        case 'recent':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching listings:', fetchError);
        setError('Erro ao carregar anúncios. Tente novamente.');
      } else {
        // Sort: Master plan listings always come first (stable sort)
        const sorted = [...(data || [])].sort((a, b) => {
          if (a.plan === 'master' && b.plan !== 'master') return -1;
          if (a.plan !== 'master' && b.plan === 'master') return 1;
          return 0;
        });
        setListings(sorted);
      }

      setLoading(false);
    }

    fetchListings();
  }, [sortBy, filters]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Page Header */}
          <div className="py-8 border-b border-border mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Empresas à Venda</h1>
            <p className="text-muted-foreground">
              {loading ? 'Carregando...' : `${listings.length} oportunidades encontradas`}
            </p>
          </div>

          <div className="flex gap-8">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-24">
                <FilterSidebar filters={filters} onFiltersChange={setFilters} />
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6 gap-4">
                {/* Mobile Filter */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden">
                      <SlidersHorizontal className="h-4 w-4 mr-2" /> Filtros
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <FilterSidebar 
                      className="border-0 rounded-none h-full" 
                      filters={filters} 
                      onFiltersChange={setFilters} 
                    />
                  </SheetContent>
                </Sheet>

                <div className="flex items-center gap-3 ml-auto">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Mais Recentes</SelectItem>
                      <SelectItem value="price-asc">Menor Preço</SelectItem>
                      <SelectItem value="price-desc">Maior Preço</SelectItem>
                      <SelectItem value="revenue">Maior Faturamento</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="hidden md:flex border border-border rounded-lg">
                    <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Business Grid */}
              {error ? (
                <div className="text-center py-12">
                  <p className="text-destructive">{error}</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : loading ? (
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'flex flex-col gap-4'
                }>
                  {[...Array(6)].map((_, i) => (
                    <BusinessCardSkeleton key={i} />
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg mb-2">Nenhuma empresa encontrada</p>
                  <p className="text-muted-foreground text-sm">Seja o primeiro a anunciar!</p>
                </div>
              ) : (
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'flex flex-col gap-4'
                }>
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Marketplace;
