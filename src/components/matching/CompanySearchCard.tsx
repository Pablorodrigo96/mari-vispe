import { useState, useEffect } from 'react';
import { Search, MapPin, Tag, Loader2, Sparkles, Brain, Cpu } from 'lucide-react';
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

const scanningPhrases = [
  'Analisando setor de atuação...',
  'Cruzando dados de mercado...',
  'Calculando compatibilidade...',
  'Identificando oportunidades...',
];

export function CompanySearchCard() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [listing, setListing] = useState<ListingData | null>(null);
  const [opportunities, setOpportunities] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [scanPhrase, setScanPhrase] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(() => {
      setScanPhrase((prev) => (prev + 1) % scanningPhrases.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [scanning]);

  const handleSearch = async () => {
    if (query.trim().length < 3) return;

    setLoading(true);
    setScanning(true);
    setError(null);
    setListing(null);
    setScanPhrase(0);

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
    <section className="py-16 gradient-navy-deep bg-grid-pattern relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/[0.04] rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 relative z-10">
        <Card className="max-w-2xl mx-auto glass-card border-accent/10 shadow-gold">
          <CardContent className="p-6 md:p-8">
            {/* Label */}
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-accent" />
              <h2 className="text-lg font-semibold text-primary-foreground">Busque sua empresa pelo nome</h2>
            </div>
            <p className="text-sm text-primary-foreground/50 mb-5">
              Nossa IA analisa centenas de variáveis para encontrar negócios compatíveis.
            </p>

            {/* Search input */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-foreground/30" />
                <Input
                  placeholder="Digite o nome da sua empresa..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 h-12 text-base bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-accent/50"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading || query.trim().length < 3}
                className="h-12 px-6 gradient-gold text-navy font-semibold hover:opacity-90"
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
                  className="flex flex-col items-center gap-4 py-10"
                >
                  {/* Radar rings */}
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-2 rounded-full border-2 border-accent/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
                    <div className="absolute inset-4 rounded-full border-2 border-accent/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.8s' }} />
                    <Brain className="w-7 h-7 text-accent relative z-10" />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={scanPhrase}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.3 }}
                      className="text-sm text-accent font-medium"
                    >
                      {scanningPhrases[scanPhrase]}
                    </motion.p>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && !scanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm text-center border border-destructive/20"
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
                  <div className="p-4 rounded-lg glass-card border-accent/10 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-primary-foreground text-lg">{listing.title}</h3>
                      <Badge variant="secondary" className="text-xs bg-accent/10 text-accent border-accent/20">{listing.category}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {listing.city && listing.state && (
                        <div className="flex items-center gap-2 text-primary-foreground/60">
                          <MapPin className="w-4 h-4" />
                          {listing.city}/{listing.state}
                        </div>
                      )}
                      {listing.annual_revenue && (
                        <div className="flex items-center gap-2 text-primary-foreground/60">
                          <Tag className="w-4 h-4" />
                          Faturamento: {formatCurrency(listing.annual_revenue)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Opportunities */}
                  <p className="text-center text-sm text-primary-foreground/50 font-medium">
                    Encontramos oportunidades compatíveis com o seu negócio!
                  </p>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="flex flex-col items-center gap-4 py-4"
                  >
                    <div className="flex items-center gap-2 px-6 py-3 rounded-full glass-card border-accent/30 shadow-gold">
                      <Sparkles className="w-5 h-5 text-accent" />
                      <span className="text-lg font-bold text-gradient-gold">
                        {opportunities} {opportunities === 1 ? 'oportunidade encontrada!' : 'oportunidades encontradas!'}
                      </span>
                    </div>

                    <Button
                      size="lg"
                      onClick={handleViewOpportunities}
                      className="gradient-gold text-navy font-semibold shadow-gold hover:opacity-90"
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
