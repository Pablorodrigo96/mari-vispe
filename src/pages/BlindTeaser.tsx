import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import TeaserHero from '@/components/teaser/TeaserHero';
import TeaserIntro from '@/components/teaser/TeaserIntro';
import TeaserFinancials from '@/components/teaser/TeaserFinancials';
import TeaserDetails from '@/components/teaser/TeaserDetails';
import TeaserContact from '@/components/teaser/TeaserContact';
import { toast } from 'sonner';

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
  additional_info: string | null;
}

const BlindTeaser = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [listing, setListing] = useState<TeaserListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [totalViews, setTotalViews] = useState(0);
  const [uniqueViews, setUniqueViews] = useState(0);
  const interestRegistered = useRef(false);

  // Auto-register interest after auth redirect
  useEffect(() => {
    const registerInterest = async () => {
      if (
        !user ||
        !listing ||
        interestRegistered.current ||
        searchParams.get('interest') !== 'true'
      ) return;

      interestRegistered.current = true;

      try {
        const { data: existing } = await supabase
          .from('interest_logs' as any)
          .select('id')
          .eq('listing_id', listing.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existing) {
          // Fetch profile data to include investor info
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name, phone')
            .eq('user_id', user.id)
            .maybeSingle();

          await supabase
            .from('interest_logs' as any)
            .insert({
              listing_id: listing.id,
              user_id: user.id,
              ticker: listing.ticker,
              investor_name: profile?.full_name || null,
              investor_company: profile?.company_name || null,
              investor_email: user.email || null,
              investor_whatsapp: profile?.phone || null,
            });
          toast.success('Interesse registrado com sucesso!');
        }
      } catch (error) {
        console.error('Error auto-registering interest:', error);
      }

      // Clean URL param
      searchParams.delete('interest');
      setSearchParams(searchParams, { replace: true });
    };

    registerInterest();
  }, [user, listing, searchParams, setSearchParams]);

  useEffect(() => {
    const fetchListing = async () => {
      if (!ticker) return;

      try {
        // Try public_listings view first
        let { data, error } = await supabase
          .from('public_listings')
          .select('*')
          .eq('ticker', ticker)
          .maybeSingle();

        // Fallback: try listings table directly for active listings
        if (!data) {
          const result = await supabase
            .from('listings')
            .select('*')
            .eq('ticker', ticker)
            .eq('status', 'active')
            .maybeSingle();
          
          data = result.data;
          error = result.error;
        }

        if (error) throw error;
        if (!data) {
          setNotFound(true);
        } else {
          const listingData = data as unknown as TeaserListing;
          setListing(listingData);
          document.title = `Blind Teaser ${listingData.ticker} | PME.B3`;

          // Register view
          try {
            await supabase
              .from('teaser_views' as any)
              .insert({
                listing_id: listingData.id,
                viewer_id: user?.id || null,
              });
          } catch (e) {
            console.error('Error registering view:', e);
          }

          // Fetch view counts
          try {
            const { data: viewData } = await supabase.rpc('get_teaser_view_count', {
              p_listing_id: listingData.id,
            });
            if (viewData && viewData.length > 0) {
              setTotalViews(Number(viewData[0].total_views) || 0);
              setUniqueViews(Number(viewData[0].unique_views) || 0);
            }
          } catch (e) {
            console.error('Error fetching view count:', e);
          }
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
      <TeaserHero ticker={listing.ticker} totalViews={totalViews} uniqueViews={uniqueViews} />
      <TeaserIntro
        description={listing.description}
        category={listing.category}
        foundationYear={listing.foundation_year}
        city={listing.city}
        state={listing.state}
        additionalInfo={listing.additional_info}
      />
      <TeaserFinancials
        annualRevenue={listing.annual_revenue}
        annualProfit={listing.annual_profit}
        askingPrice={listing.asking_price}
        hidePrice={listing.hide_price}
        equityScore={(listing as any).equity_score}
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
