import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MatchCard } from '@/components/matching/MatchCard';
import { ConsultorBanner } from '@/components/matching/ConsultorBanner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Nenhum negócio selecionado</h1>
          <p className="text-muted-foreground mb-6">
            Primeiro, busque um negócio na página de matching.
          </p>
          <Button onClick={() => navigate('/matching')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
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
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Buscando matches...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-center py-16">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchMatches} variant="outline">Tentar novamente</Button>
        </div>
      );
    }
    if (matches.length === 0) {
      return (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Nenhum match encontrado com os filtros atuais.</p>
        </div>
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((match, i) => (
          <MatchCard key={match.id || i} match={match} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/matching')} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Oportunidades para <span className="text-accent">{listing.title}</span>
          </h1>
          <p className="text-muted-foreground">
            {total} negócios compatíveis encontrados na categoria {listing.category}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ESTADOS.map((uf) => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Consultor Banner */}
        <ConsultorBanner />

        {/* Tabs */}
        <Tabs value={matchType} onValueChange={setMatchType} className="mb-6">
          <TabsList>
            <TabsTrigger value="horizontal">Horizontal</TabsTrigger>
            <TabsTrigger value="vertical">Vertical</TabsTrigger>
          </TabsList>
          <p className="text-xs text-muted-foreground mt-2">
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
