import { useState } from 'react';
import { Search, MapPin, Tag, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';

interface ListingData {
  id: string;
  title: string;
  category: string;
  city: string | null;
  state: string | null;
  annual_revenue: number | null;
  annual_profit: number | null;
  asking_price: number | null;
  images: string[] | null;
  description: string | null;
}

export function CompanySearchCard() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [listing, setListing] = useState<ListingData | null>(null);
  const [opportunities, setOpportunities] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSearch = async () => {
    if (query.trim().length < 3) return;

    setLoading(true);
    setScanning(true);
    setError(null);
    setListing(null);

    try {
      await new Promise((r) => setTimeout(r, 1200));

      const { data, error: fnError } = await supabase.functions.invoke('company-lookup', {
        body: { query: query.trim() },
      });

      setScanning(false);

      if (fnError) throw fnError;
      if (data.error) {
        setError(data.error);
        return;
      }

      setListing(data.listing);
      setOpportunities(data.opportunities || 0);
    } catch (err: any) {
      setScanning(false);
      setError(err.message || 'Erro ao buscar negócio.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOpportunities = () => {
    if (!user) {
      navigate('/auth?redirect=/matching/resultados');
    } else {
      navigate('/matching/resultados', { state: { listing } });
    }
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto border-border/50 shadow-lg">
          <CardContent className="p-6 md:p-8">
            {/* Search input */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Busque por nome, categoria ou cidade..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading || query.trim().length < 3}
                className="h-12 px-6 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buscar'}
              </Button>
            </div>

            {/* Scanning animation */}
            <AnimatePresence>
              {scanning && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-3 py-8"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
                    <Search className="absolute inset-0 m-auto w-6 h-6 text-accent" />
                  </div>
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Buscando negócios compatíveis...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && !scanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Listing result */}
            <AnimatePresence>
              {listing && !scanning && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-foreground text-lg">{listing.title}</h3>
                      <Badge variant="secondary" className="text-xs">{listing.category}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {listing.city && listing.state && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {listing.city}/{listing.state}
                        </div>
                      )}
                      {listing.annual_revenue && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Tag className="w-4 h-4" />
                          Faturamento: {formatCurrency(listing.annual_revenue)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Opportunities badge */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="flex flex-col items-center gap-4 py-4"
                  >
                    <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent/10 border border-accent/20">
                      <Sparkles className="w-5 h-5 text-accent" />
                      <span className="text-lg font-bold text-accent">
                        {opportunities} {opportunities === 1 ? 'oportunidade encontrada!' : 'oportunidades encontradas!'}
                      </span>
                    </div>

                    <Button
                      size="lg"
                      onClick={handleViewOpportunities}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold"
                    >
                      {user ? 'Ver oportunidades' : 'Cadastre-se para ver as oportunidades'}
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
