import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { PublicFooter as Footer } from '@/components/layout/PublicFooter';
import { MatchCard } from '@/components/matching/MatchCard';
import { ConsultorBanner } from '@/components/matching/ConsultorBanner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, Filter, Brain, Layers, GitBranch, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

export default function MatchingResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [matchType, setMatchType] = useState<string>('horizontal');

  const listing = (location.state as any)?.listing;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/matching');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!listing || !user) return;
    fetchMatches();
  }, [listing, user, estadoFilter, matchType]);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('matching-engine', {
        body: {
          listingId: listing.id,
          category: listing.category,
          state: listing.state,
          city: listing.city,
          annual_revenue: listing.annual_revenue,
          asking_price: listing.asking_price,
          annual_profit: listing.annual_profit,
          matchType,
          filters: {
            estado: estadoFilter && estadoFilter !== 'all' ? estadoFilter : undefined,
          },
        },
      });

      if (fnError) throw fnError;
      if (data.error) {
        setError(data.error);
        return;
      }

      setMatches(data.matches || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar matches.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen gradient-navy-deep flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen gradient-navy-deep">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16 text-center">
          <h1 className="text-2xl font-bold text-primary-foreground mb-4">Nenhum negócio selecionado</h1>
          <p className="text-primary-foreground/50 mb-6">
            Primeiro, busque um negócio na página de matching.
          </p>
          <Button onClick={() => navigate('/matching')} className="gradient-gold text-navy font-semibold">
            Ir para Matching
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const renderResults = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-3 rounded-full border-2 border-accent/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
            <Brain className="w-6 h-6 text-accent relative z-10" />
          </div>
          <p className="text-primary-foreground/50 text-sm">IA processando compatibilidades...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-center py-16">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchMatches} variant="outline" className="border-primary-foreground/10 text-primary-foreground/70 bg-transparent">
            Tentar novamente
          </Button>
        </div>
      );
    }
    if (matches.length === 0) {
      return (
        <div className="text-center py-16">
          <p className="text-primary-foreground/50">Nenhum match encontrado com os filtros atuais.</p>
        </div>
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((match, i) => (
          <MatchCard key={match.id || i} match={match} index={i} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen gradient-navy-deep bg-grid-pattern">
      <Header />

      {/* Mini hero header */}
      <div className="relative pt-28 pb-10 overflow-hidden">
        <div className="absolute top-10 right-0 w-[400px] h-[400px] bg-accent/[0.06] rounded-full blur-[120px]" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Button variant="ghost" size="sm" onClick={() => navigate('/matching')} className="mb-4 gap-2 text-primary-foreground/50 hover:text-primary-foreground hover:bg-primary-foreground/5">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-primary-foreground mb-2">
              Oportunidades para <span className="text-gradient-gold">{listing.title}</span>
            </h1>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="glass-card rounded-lg px-4 py-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-primary-foreground">{total}</span>
                <span className="text-sm text-primary-foreground/50">matches</span>
              </div>
              <div className="glass-card rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-sm text-primary-foreground/50">Categoria:</span>
                <span className="text-sm font-semibold text-accent">{listing.category}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-wrap gap-3 mb-6 items-center"
        >
          <Filter className="w-4 h-4 text-primary-foreground/30" />
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-40 bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ESTADOS.map((uf) => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Consultor Banner */}
        <ConsultorBanner />

        {/* Tabs */}
        <Tabs value={matchType} onValueChange={setMatchType} className="mb-6">
          <TabsList className="bg-primary-foreground/5 border border-primary-foreground/10">
            <TabsTrigger value="horizontal" className="gap-2 data-[state=active]:bg-accent/10 data-[state=active]:text-accent">
              <Layers className="w-4 h-4" />
              Horizontal
            </TabsTrigger>
            <TabsTrigger value="vertical" className="gap-2 data-[state=active]:bg-accent/10 data-[state=active]:text-accent">
              <GitBranch className="w-4 h-4" />
              Vertical
            </TabsTrigger>
          </TabsList>
          <p className="text-xs text-primary-foreground/40 mt-2">
            {matchType === 'horizontal'
              ? 'Empresas do mesmo setor ou setores similares'
              : 'Empresas de setores complementares na cadeia de valor'}
          </p>
        </Tabs>

        {renderResults()}
      </div>
      <Footer />
    </div>
  );
}
