import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, DollarSign, TrendingUp, Clock, ArrowLeft } from 'lucide-react';
import { formatFullCurrency } from '@/lib/formatters';

interface CapitalRequest {
  id: string;
  company_name: string;
  requested_amount: number;
  capital_type: string;
  objective: string;
  status: string;
  views_count: number;
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  in_review: { label: 'Em Análise', variant: 'default' },
  proposal_sent: { label: 'Proposta Enviada', variant: 'outline' },
  closed: { label: 'Fechado', variant: 'destructive' },
};

const capitalTypeLabels: Record<string, string> = {
  divida: 'Dívida',
  equity: 'Equity',
};

const objectiveLabels: Record<string, string> = {
  giro: 'Capital de Giro',
  expansao: 'Expansão',
  refinanciamento: 'Refinanciamento',
  socio: 'Busca de Sócio',
};

export default function MyCapitalRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CapitalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('capital_requests')
      .select('id, company_name, requested_amount, capital_type, objective, status, views_count, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minhas Captações</h1>
            <p className="text-muted-foreground">Acompanhe o status das suas solicitações de capital</p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma solicitação ainda</h3>
              <p className="text-muted-foreground mb-6">Solicite captação de capital na página de Captação.</p>
              <Button onClick={() => navigate('/capital')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Ir para Captação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {requests.map((req) => {
              const status = statusConfig[req.status] || statusConfig.pending;
              return (
                <Card key={req.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">{req.company_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {capitalTypeLabels[req.capital_type] || req.capital_type} · {objectiveLabels[req.objective] || req.objective}
                        </p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-accent" />
                        <div>
                          <p className="text-xs text-muted-foreground">Valor</p>
                          <p className="text-sm font-semibold text-foreground">{formatFullCurrency(req.requested_amount)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Visualizações</p>
                          <p className="text-sm font-semibold text-foreground">{req.views_count}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Criado em</p>
                          <p className="text-sm font-semibold text-foreground">
                            {new Date(req.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
