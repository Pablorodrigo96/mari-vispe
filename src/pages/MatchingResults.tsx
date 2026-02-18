import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MatchCard } from '@/components/matching/MatchCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const company = (location.state as any)?.company;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/matching');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!company || !user) return;
    fetchMatches();
  }, [company, user, estadoFilter]);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('matching-engine', {
        body: {
          cnpj: company.cnpj,
          cnae_principal: company.cnae_principal,
          estado: company.estado,
          cidade: company.cidade,
          capital_social: company.capital_social,
          filters: {
            estado: estadoFilter || undefined,
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

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Nenhuma empresa selecionada</h1>
          <p className="text-muted-foreground mb-6">
            Primeiro, busque sua empresa na página de matching.
          </p>
          <Button onClick={() => navigate('/matching')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Ir para Matching
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const companyName = company.nome_fantasia || company.razao_social;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-28 pb-16">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/matching')} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Oportunidades para <span className="text-accent">{companyName}</span>
          </h1>
          <p className="text-muted-foreground">
            {total} empresas compatíveis encontradas no setor {company.cnae_principal}
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
              <SelectItem value="">Todos</SelectItem>
              {ESTADOS.map((uf) => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-muted-foreground">Buscando matches...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchMatches} variant="outline">
              Tentar novamente
            </Button>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Nenhum match encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match, i) => (
              <MatchCard key={match.cnpj || i} match={match} companyName={companyName} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
