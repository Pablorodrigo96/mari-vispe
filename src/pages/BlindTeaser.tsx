import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import TeaserHero from '@/components/teaser/TeaserHero';
import TeaserIntro from '@/components/teaser/TeaserIntro';
import TeaserFinancials from '@/components/teaser/TeaserFinancials';
import TeaserDetails from '@/components/teaser/TeaserDetails';
import TeaserContact from '@/components/teaser/TeaserContact';

interface TeaserListing {
  id: string;
  ticker: string;
  category: string | null;
  description: string | null;
  foundation_year: number | null;
  city: string | null;
  state: string | null;
  annual_revenue: number | null;
  annual_profit: number | null;
  asking_price: number | null;
  hide_price: boolean | null;
  square_meters: number | null;
  rent_value: number | null;
  iptu_value: number | null;
  sale_reason: string | null;
}

const BlindTeaser = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const [listing, setListing] = useState<TeaserListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      if (!ticker) return;

      try {
        const { data, error } = await supabase
          .from('public_listings')
          .select('*')
          .eq('ticker', ticker)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setNotFound(true);
        } else {
          setListing(data as unknown as TeaserListing);
        }
      } catch (error) {
        console.error('Error fetching teaser:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [ticker]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-12 w-64 mx-auto bg-white/10" />
          <Skeleton className="h-6 w-32 mx-auto bg-white/10" />
        </div>
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-4xl font-black text-white mb-4">Teaser não encontrado</h1>
          <p className="text-white/50">O código informado não corresponde a nenhum ativo disponível.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <TeaserHero ticker={listing.ticker} />
      <TeaserIntro
        description={listing.description}
        category={listing.category}
        foundationYear={listing.foundation_year}
        city={listing.city}
        state={listing.state}
      />
      <TeaserFinancials
        annualRevenue={listing.annual_revenue}
        annualProfit={listing.annual_profit}
        askingPrice={listing.asking_price}
        hidePrice={listing.hide_price}
      />
      <TeaserDetails
        squareMeters={listing.square_meters}
        rentValue={listing.rent_value}
        iptuValue={listing.iptu_value}
        saleReason={listing.sale_reason}
      />
      <TeaserContact listingId={listing.id} ticker={listing.ticker} />
    </div>
  );
};

export default BlindTeaser;
