import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BusinessMap } from '@/components/map/BusinessMap';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;

const MapView = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setListings(data);
      }
      setLoading(false);
    }
    fetchListings();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-16 relative">
        <BusinessMap listings={listings} loading={loading} />
      </main>
    </div>
  );
};

export default MapView;
