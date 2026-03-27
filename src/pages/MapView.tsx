import { useState, useEffect, useMemo } from 'react';
import { Filter, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { BusinessMap } from '@/components/map/BusinessMap';
import type { BuyerProfile } from '@/components/map/BusinessMap';
import { MapFilterSidebar, defaultMapFilters, DEFAULT_MAX_PRICE, type MapFilterState } from '@/components/map/MapFilterSidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;

const MapView = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [buyers, setBuyers] = useState<BuyerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MapFilterState>(defaultMapFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [listingsRes, buyersRes] = await Promise.all([
        supabase.from('listings').select('*').eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('buyer_profiles').select('*').eq('status', 'active'),
      ]);
      if (!listingsRes.error && listingsRes.data) setListings(listingsRes.data);
      if (!buyersRes.error && buyersRes.data) {
        setBuyers(buyersRes.data.map(b => ({
          id: b.id,
          buyer_name: b.buyer_name,
          company_name: b.company_name,
          email: b.email,
          whatsapp: b.whatsapp,
          categories: b.categories || [],
          min_budget: b.min_budget ? Number(b.min_budget) : null,
          max_budget: b.max_budget ? Number(b.max_budget) : null,
          city: b.city,
          state: b.state,
          description: b.description,
        })));
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const maxPrice = useMemo(() => {
    const highest = Math.max(...listings.map(l => l.asking_price ?? 0), DEFAULT_MAX_PRICE);
    return Math.ceil(highest / 1000000) * 1000000;
  }, [listings]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, priceRange: [prev.priceRange[0], maxPrice] }));
  }, [maxPrice]);

  const availableStates = useMemo(() => {
    const set = new Set([
      ...listings.map(l => l.state).filter(Boolean) as string[],
      ...buyers.map(b => b.state).filter(Boolean) as string[],
    ]);
    return Array.from(set).sort();
  }, [listings, buyers]);

  const availableCities = useMemo(() => {
    let sourceListing = listings as { city: string | null; state: string | null }[];
    let sourceBuyers = buyers as { city: string | null; state: string | null }[];
    if (filters.states.length > 0) {
      sourceListing = listings.filter(l => l.state && filters.states.includes(l.state));
      sourceBuyers = buyers.filter(b => b.state && filters.states.includes(b.state));
    }
    const set = new Set([
      ...sourceListing.map(l => l.city).filter(Boolean) as string[],
      ...sourceBuyers.map(b => b.city).filter(Boolean) as string[],
    ]);
    return Array.from(set).sort();
  }, [listings, buyers, filters.states]);

  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      if (filters.categories.length > 0 && !filters.categories.includes(l.category)) return false;
      if (filters.states.length > 0 && (!l.state || !filters.states.includes(l.state))) return false;
      if (filters.cities.length > 0 && (!l.city || !filters.cities.includes(l.city))) return false;
      const price = l.asking_price ?? 0;
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;
      return true;
    });
  }, [listings, filters]);

  const filteredBuyers = useMemo(() => {
    return buyers.filter(b => {
      if (filters.categories.length > 0 && !b.categories.some(c => filters.categories.includes(c))) return false;
      if (filters.states.length > 0 && (!b.state || !filters.states.includes(b.state))) return false;
      if (filters.cities.length > 0 && (!b.city || !filters.cities.includes(b.city))) return false;
      return true;
    });
  }, [buyers, filters]);

  const activeCount =
    filters.categories.length + filters.states.length + filters.cities.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice ? 1 : 0) +
    (!filters.showSellers || !filters.showBuyers ? 1 : 0);

  const sidebarContent = (
    <MapFilterSidebar
      filters={filters} onFiltersChange={setFilters}
      availableStates={availableStates} availableCities={availableCities}
      onClose={isMobile ? () => setSheetOpen(false) : undefined}
      isMobile={isMobile} maxPrice={maxPrice}
    />
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <Header />
      <main className="flex-1 relative flex overflow-hidden" style={{ marginTop: '64px' }}>
        {!isMobile && <div className="w-72 shrink-0 h-full overflow-hidden">{sidebarContent}</div>}
        <div className="flex-1 relative min-w-0">
          <BusinessMap
            listings={filteredListings}
            buyers={filteredBuyers}
            loading={loading}
            showSellers={filters.showSellers}
            showBuyers={filters.showBuyers}
          />

          {/* Mobile floating buttons */}
          {isMobile && (
            <div className="absolute top-3 left-3 z-[1000] flex gap-2">
              <Button
                onClick={() => setSheetOpen(true)}
                className="bg-card/90 backdrop-blur-sm border border-border text-foreground hover:bg-card shadow-lg"
                size="sm"
              >
                <Filter className="h-4 w-4 mr-1.5" />
                Filtros
                {activeCount > 0 && <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">{activeCount}</Badge>}
              </Button>
            </div>
          )}

          {/* Add buyer button */}
          <Link to="/cadastrar-comprador" className="absolute top-3 z-[1000]" style={{ right: isMobile ? '12px' : '60px' }}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Cadastrar Comprador</span>
              <span className="sm:hidden">Comprador</span>
            </Button>
          </Link>
        </div>

        {isMobile && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="left" className="p-0 w-[85vw] max-w-80">
              <SheetTitle className="sr-only">Filtros do Mapa</SheetTitle>
              {sidebarContent}
            </SheetContent>
          </Sheet>
        )}
      </main>
    </div>
  );
};

export default MapView;
