import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/types';

type PublicListing = Tables<'public_listings'>;

interface Props {
  category: string | null;
  excludeId: string | null;
  state?: string | null;
}

export function SimilarListings({ category, excludeId, state }: Props) {
  const [items, setItems] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!category || !excludeId) { setLoading(false); return; }
      setLoading(true);
      let q = supabase
        .from('public_listings')
        .select('*')
        .eq('category', category)
        .neq('id', excludeId)
        .limit(4);
      const { data } = await q;
      let list = (data ?? []) as PublicListing[];
      // Try to surface same state first
      if (state) {
        list = [
          ...list.filter((l) => l.state === state),
          ...list.filter((l) => l.state !== state),
        ].slice(0, 4);
      }
      if (alive) {
        setItems(list);
        setLoading(false);
      }
    }
    run();
    return () => { alive = false; };
  }, [category, excludeId, state]);

  if (!loading && items.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-accent mb-2">também na mari</p>
          <h2 className="text-2xl font-bold text-foreground">Negócios similares</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[420px] rounded-xl" />
            ))
          : items.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </section>
  );
}
