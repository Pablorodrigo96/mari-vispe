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
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, Users, ArrowLeft, ChevronRight } from 'lucide-react';
import { formatFullCurrency } from '@/lib/formatters';
import { CapitalScoreCard } from '@/components/capital/CapitalScoreCard';

interface CapitalRequest {
  id: string;
  company_name: string;
  requested_amount: number;
  capital_type: string;
  objective: string;
  status: string;
  views_count: number;
  created_at: string;
  lead_score: number | null;
  matched_providers_count: number | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  pending: { label: 'Pendente', variant: 'secondary', color: 'bg-amber-500' },
  in_review: { label: 'Em Análise', variant: 'default', color: 'bg-blue-500' },
  matched: { label: 'Matched', variant: 'outline', color: 'bg-purple-500' },
  proposal_sent: { label: 'Proposta Enviada', variant: 'default', color: 'bg-emerald-500' },
  closed: { label: 'Fechado', variant: 'destructive', color: 'bg-muted-foreground' },
};

const capitalTypeLabels: Record<string, string> = { divida: 'Dívida', equity: 'Equity' };
const objectiveLabels: Record<string, string> = {
  giro: 'Capital de Giro', expansao: 'Expansão', refinanciamento: 'Refinanciamento', socio: 'Busca de Sócio',
};

const nextActionText: Record<string, string> = {
  pending: 'Enviar documentos',
  in_review: 'Aguardar análise',
  matched: 'Revisar provedores',
  proposal_sent: 'Analisar proposta',
  closed: 'Captação finalizada',
};

export default function MyCapitalRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CapitalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('capital_requests')
      .select('id, company_name, requested_amount, capital_type, objective, status, views_count, created_at, lead_score, matched_providers_count')
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  };

  const getProgress = (status: string) => {
    const steps = ['pending', 'in_review', 'matched', 'proposal_sent', 'closed'];
    return ((steps.indexOf(status) + 1) / steps.length) * 100;
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
            {[1, 2].map(i => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
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
            {requests.map(req => {
              const st = statusConfig[req.status] || statusConfig.pending;
              return (
                <Card
                  key={req.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/minhas-captacoes/${req.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg">{req.company_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {capitalTypeLabels[req.capital_type] || req.capital_type} · {objectiveLabels[req.objective] || req.objective}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={st.variant}>{st.label}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <CapitalScoreCard score={req.lead_score} size="sm" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-accent" />
                          <span className="text-sm font-semibold text-foreground">{formatFullCurrency(req.requested_amount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{req.matched_providers_count || 0} provedores</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{nextActionText[req.status] || 'Aguardar'}</span>
                        <span>{Math.round(getProgress(req.status))}%</span>
                      </div>
                      <Progress value={getProgress(req.status)} className="h-1.5" />
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
