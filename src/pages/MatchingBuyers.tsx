import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { PublicFooter as Footer } from '@/components/layout/PublicFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Lock, Users, MapPin, DollarSign, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface MatchingBuyer {
  id: string;
  buyer_name: string;
  company_name: string | null;
  categories: string[];
  state: string | null;
  city: string | null;
  min_budget: number | null;
  max_budget: number | null;
  description: string | null;
  score: number;
}

const MatchingBuyers = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { subscription } = useSubscription();
  const [buyers, setBuyers] = useState<MatchingBuyer[]>([]);
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isMaster = subscription?.plan === 'master' || subscription?.plan === 'franchisee';

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !listingId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch listing
        const { data: listingData } = await supabase
          .from('listings')
          .select('id, title, category, state, city, asking_price, ticker')
          .eq('id', listingId)
          .eq('user_id', user.id)
          .single();

        if (!listingData) {
          toast.error('Anúncio não encontrado');
          navigate('/meus-anuncios');
          return;
        }
        setListing(listingData);

        // Fetch matching buyers
        const { data: buyerData } = await supabase
          .from('public_buyer_profiles' as any)
          .select('*')
          .eq('status', 'active')
          .contains('categories', [listingData.category]);

        if (buyerData) {
          const scored = (buyerData as any[]).map((b: any) => {
            let score = 50; // base for category match
            if (b.state === listingData.state) score += 25;
            if (b.city === listingData.city) score += 15;
            if (listingData.asking_price && b.max_budget && b.max_budget >= listingData.asking_price) score += 10;
            return { ...b, score };
          }).sort((a: any, b: any) => b.score - a.score);

          setBuyers(scored);
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, listingId, navigate]);

  const categoryLabels: Record<string, string> = {
    food: 'Alimentos', health: 'Saúde', tech: 'Tecnologia',
    commerce: 'Comércio', industry: 'Indústria', education: 'Educação',
    logistics: 'Logística', services: 'Serviços', telecom: 'Telecom',
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/meus-anuncios">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-7 w-7" />
            Compradores Compatíveis
          </h1>
          {listing && (
            <p className="text-muted-foreground mt-1">
              Para o anúncio: <strong>{listing.title}</strong> ({listing.ticker || 'sem ticker'})
            </p>
          )}
        </div>

        {buyers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum comprador compatível encontrado</h3>
              <p className="text-muted-foreground mt-2">
                Ainda não há compradores cadastrados buscando empresas na categoria do seu anúncio.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-muted-foreground mb-4">
              {buyers.length} comprador{buyers.length > 1 ? 'es' : ''} compatíve{buyers.length > 1 ? 'is' : 'l'} encontrado{buyers.length > 1 ? 's' : ''}
            </p>

            {!isMaster && (
              <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
                <CardContent className="py-4 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-medium">Identidades ocultas</p>
                      <p className="text-sm text-muted-foreground">
                        Faça upgrade para o Plano Master para ver nomes e contatos dos compradores
                      </p>
                    </div>
                  </div>
                  <Button asChild className="bg-amber-500 hover:bg-amber-600">
                    <Link to="/valuation">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade Master
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {buyers.map((buyer, index) => (
                <Card key={buyer.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {isMaster ? buyer.buyer_name : `Comprador #${index + 1}`}
                        {isMaster && buyer.company_name && (
                          <span className="text-sm font-normal text-muted-foreground ml-2">
                            — {buyer.company_name}
                          </span>
                        )}
                      </CardTitle>
                      <Badge variant={buyer.score >= 70 ? 'default' : 'secondary'}>
                        {buyer.score}% compatível
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {buyer.categories.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span>Busca:</span>
                          {buyer.categories.map((c) => (
                            <Badge key={c} variant="outline" className="text-xs">
                              {categoryLabels[c] || c}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {(buyer.state || buyer.city) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {buyer.city && `${buyer.city}, `}{buyer.state}
                        </div>
                      )}
                      {(buyer.min_budget || buyer.max_budget) && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          {buyer.min_budget ? formatCurrency(buyer.min_budget) : '—'}
                          {' — '}
                          {buyer.max_budget ? formatCurrency(buyer.max_budget) : '—'}
                        </div>
                      )}
                    </div>
                    {isMaster && buyer.description && (
                      <p className="mt-3 text-sm">{buyer.description}</p>
                    )}
                    {!isMaster && (
                      <p className="mt-3 text-sm text-muted-foreground italic flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5" />
                        Detalhes disponíveis no Plano Master
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MatchingBuyers;
