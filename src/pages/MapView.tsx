import { useState, useEffect, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BusinessMap } from '@/components/map/BusinessMap';
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
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MapFilterState>(defaultMapFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!error && data) setListings(data);
      setLoading(false);
    }
    fetchListings();
  }, []);

  // Derive max price from listings
  const maxPrice = useMemo(() => {
    const highest = Math.max(...listings.map((l) => l.asking_price ?? 0), DEFAULT_MAX_PRICE);
    return Math.ceil(highest / 1000000) * 1000000; // round up to nearest million
  }, [listings]);

  // Reset price range when maxPrice changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      priceRange: [prev.priceRange[0], maxPrice],
    }));
  }, [maxPrice]);

  // Derive available states from all listings
  const availableStates = useMemo(() => {
    const set = new Set(listings.map((l) => l.state).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [listings]);

  // Derive available cities, filtered by selected states
  const availableCities = useMemo(() => {
    let source = listings;
    if (filters.states.length > 0) {
      source = listings.filter((l) => l.state && filters.states.includes(l.state));
    }
    const set = new Set(source.map((l) => l.city).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [listings, filters.states]);

  // Apply filters client-side
  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (filters.categories.length > 0 && !filters.categories.includes(l.category)) return false;
      if (filters.states.length > 0 && (!l.state || !filters.states.includes(l.state))) return false;
      if (filters.cities.length > 0 && (!l.city || !filters.cities.includes(l.city))) return false;
      const price = l.asking_price ?? 0;
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;
      return true;
    });
  }, [listings, filters]);

  const activeCount =
    filters.categories.length +
    filters.states.length +
    filters.cities.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice ? 1 : 0);

  const sidebarContent = (
    <MapFilterSidebar
      filters={filters}
      onFiltersChange={setFilters}
      availableStates={availableStates}
      availableCities={availableCities}
      onClose={isMobile ? () => setSheetOpen(false) : undefined}
      isMobile={isMobile}
      maxPrice={maxPrice}
    />
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-16 relative flex">
        {/* Desktop sidebar */}
        {!isMobile && (
          <div className="w-72 shrink-0 h-full overflow-hidden">
            {sidebarContent}
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          <BusinessMap listings={filteredListings} loading={loading} />

          {/* Mobile floating filter button */}
          {isMobile && (
            <Button
              onClick={() => setSheetOpen(true)}
              className="absolute top-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border text-foreground hover:bg-card shadow-lg"
              size="sm"
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Filtros
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                  {activeCount}
                </Badge>
              )}
            </Button>
          )}
        </div>

        {/* Mobile Sheet */}
        {isMobile && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="left" className="p-0 w-80">
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
