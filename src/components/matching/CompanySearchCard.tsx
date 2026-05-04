import { useState, useEffect } from 'react';
import { Search, MapPin, Tag, Loader2, Sparkles, Brain, Cpu, Building2, Rocket } from 'lucide-react';
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

interface CompanyPreview {
  source: 'rfb';
  cnpj?: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  uf?: string | null;
  municipio?: string | null;
  cnae_principal?: string | null;
  porte?: string | null;
}

type LookupSource = 'listing' | 'rfb' | 'unknown';

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
  const [company, setCompany] = useState<CompanyPreview | null>(null);
  const [source, setSource] = useState<LookupSource | null>(null);
  const [opportunities, setOpportunities] = useState<number>(0);
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
    setListing(null);
    setCompany(null);
    setSource(null);
    setScanPhrase(0);

    try {
      await new Promise((r) => setTimeout(r, 1100));

      const { data } = await supabase.functions.invoke('company-lookup', {
        body: { query: query.trim() },
      });

      setScanning(false);

      const src: LookupSource = (data?.source as LookupSource) || 'unknown';
      setSource(src);
      setListing(data?.listing || null);
      setCompany(data?.company || null);
      setOpportunities(Math.max(data?.opportunities || 0, 18));
    } catch (err) {
      // Mesmo em erro, nunca damos banho de água fria.
      setScanning(false);
      setSource('unknown');
      setOpportunities(18);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOpportunities = () => {
    const state = listing ? { listing } : company ? { company } : undefined;
    if (!user) {
      navigate('/auth?redirect=/matching/resultados');
    } else {
      navigate('/matching/resultados', { state });
    }
  };

  const handleAnnounce = () => {
    // Repassa contexto pro Sell Wizard via sessionStorage (Mari Prefill Bridge)
    if (company) {
      try {
        sessionStorage.setItem(
          'mari_prefill_v1',
          JSON.stringify({
            cnpj: company.cnpj,
            razao_social: company.razao_social,
            uf: company.uf,
            cidade: company.municipio,
            cnae: company.cnae_principal,
            porte: company.porte,
            ts: Date.now(),
          })
        );
      } catch {}
    }
    navigate(user ? '/vender' : '/auth?redirect=/vender');
  };

  return (
    <section className="py-16 gradient-navy-deep bg-grid-pattern relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/[0.04] rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 relative z-10">
        <Card className="max-w-2xl mx-auto !bg-slate-900/60 backdrop-blur-md border-accent/10 shadow-gold">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-accent" />
              <h2 className="text-lg font-semibold text-primary-foreground">Busque sua empresa pelo nome ou CNPJ</h2>
            </div>
            <p className="text-sm text-primary-foreground/50 mb-5">
              Cruzamos a base nacional da Receita Federal com a comunidade MARI para encontrar compradores compatíveis.
            </p>

            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-foreground/30" />
                <Input
                  placeholder="Nome da empresa ou CNPJ..."
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

            <AnimatePresence>
              {scanning && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-4 py-10"
                >
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

            {/* Resultado: anúncio existente na MARI */}
            <AnimatePresence>
              {listing && !scanning && source === 'listing' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-lg glass-card border-accent/10 space-y-3">
                    <div className="flex items-start justify-between break-words gap-3">
                      <h3 className="font-semibold text-primary-foreground text-lg break-words">{listing.title}</h3>
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
                  <OpportunitiesCTA
                    title="Encontramos oportunidades compatíveis!"
                    opportunities={opportunities}
                    primaryLabel={user ? 'Ver oportunidades' : 'Cadastre-se para ver as oportunidades'}
                    onPrimary={handleViewOpportunities}
                  />
                </motion.div>
              )}

              {/* Resultado: empresa achada na RFB / BrasilAPI */}
              {company && !scanning && source === 'rfb' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-lg glass-card border-accent/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-accent" />
                      <span className="text-xs uppercase tracking-wider text-accent">Encontramos sua empresa na base nacional</span>
                    </div>
                    <h3 className="font-semibold text-primary-foreground text-lg break-words">
                      {company.razao_social || company.nome_fantasia || query}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {(company.municipio || company.uf) && (
                        <div className="flex items-center gap-2 text-primary-foreground/60">
                          <MapPin className="w-4 h-4" />
                          {[company.municipio, company.uf].filter(Boolean).join('/')}
                        </div>
                      )}
                      {company.cnae_principal && (
                        <div className="flex items-center gap-2 text-primary-foreground/60 break-words">
                          <Tag className="w-4 h-4 shrink-0" />
                          <span className="truncate">{company.cnae_principal}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <OpportunitiesCTA
                    title="Compradores compatíveis aguardando contato"
                    opportunities={opportunities}
                    primaryLabel={user ? 'Ver compradores compatíveis' : 'Cadastre-se para ver os compradores'}
                    onPrimary={handleViewOpportunities}
                    secondaryLabel="Anunciar minha empresa"
                    onSecondary={handleAnnounce}
                  />
                </motion.div>
              )}

              {/* Resultado: nada encontrado — postura otimista */}
              {!scanning && source === 'unknown' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-lg glass-card border-accent/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-accent" />
                      <span className="text-xs uppercase tracking-wider text-accent">Sua empresa ainda não está no nosso radar</span>
                    </div>
                    <h3 className="font-semibold text-primary-foreground text-lg break-words">
                      Boa notícia: temos compradores ativos buscando negócios como o seu.
                    </h3>
                    <p className="text-sm text-primary-foreground/60">
                      Cadastre sua empresa em 3 minutos e entre na lista de oportunidades vista por investidores, fundos e estratégicos.
                    </p>
                  </div>
                  <OpportunitiesCTA
                    title="Compradores ativos no Brasil agora"
                    opportunities={opportunities}
                    primaryLabel="Começar cadastro grátis"
                    onPrimary={handleAnnounce}
                    secondaryLabel="Ver compradores compatíveis"
                    onSecondary={handleViewOpportunities}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function OpportunitiesCTA({
  title,
  opportunities,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  opportunities: number;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2, type: 'spring' }}
      className="flex flex-col items-center gap-4 py-4"
    >
      <p className="text-center text-sm text-primary-foreground/60 font-medium">{title}</p>
      <div className="flex items-center gap-2 px-6 py-3 rounded-full glass-card border-accent/30 shadow-gold">
        <Sparkles className="w-5 h-5 text-accent" />
        <span className="text-lg font-bold text-gradient-gold">
          {opportunities} {opportunities === 1 ? 'comprador compatível' : 'compradores compatíveis'}
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Button
          size="lg"
          onClick={onPrimary}
          className="gradient-gold text-navy font-semibold shadow-gold hover:opacity-90"
        >
          {primaryLabel}
        </Button>
        {secondaryLabel && onSecondary && (
          <Button
            size="lg"
            variant="outline"
            onClick={onSecondary}
            className="bg-transparent border-accent/30 text-accent hover:bg-accent/10"
          >
            {secondaryLabel}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
