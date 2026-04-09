import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Building2, DollarSign, Target, Calendar, Printer } from 'lucide-react';
import { formatFullCurrency } from '@/lib/formatters';
import { CapitalTimeline } from '@/components/capital/CapitalTimeline';
import { CapitalDocChecklist } from '@/components/capital/CapitalDocChecklist';
import { CapitalChat } from '@/components/capital/CapitalChat';
import { CapitalScoreCard } from '@/components/capital/CapitalScoreCard';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  in_review: { label: 'Em Análise', variant: 'default' },
  matched: { label: 'Matched', variant: 'outline' },
  proposal_sent: { label: 'Proposta Enviada', variant: 'default' },
  closed: { label: 'Fechado', variant: 'destructive' },
};

const capitalTypeLabels: Record<string, string> = { divida: 'Dívida', equity: 'Equity' };
const objectiveLabels: Record<string, string> = {
  giro: 'Capital de Giro', expansao: 'Expansão', refinanciamento: 'Refinanciamento', socio: 'Busca de Sócio',
};

interface Match {
  id: string;
  match_score: number | null;
  status: string | null;
  provider_id: string;
}

export default function CapitalRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsCount, setDocsCount] = useState(0);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!id) return;
    fetchData();
    // Increment view
    supabase.rpc('increment_capital_view', { p_request_id: id });
  }, [user, id]);

  const fetchData = async () => {
    const [reqRes, matchRes, docsRes] = await Promise.all([
      supabase.from('capital_requests').select('*').eq('id', id!).single(),
      supabase.from('capital_matches').select('id, match_score, status, provider_id').eq('request_id', id!),
      supabase.from('capital_documents').select('id').eq('request_id', id!),
    ]);
    if (reqRes.data) setRequest(reqRes.data);
    if (matchRes.data) setMatches(matchRes.data);
    if (docsRes.data) setDocsCount(docsRes.data.length);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <Skeleton className="h-96 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16 text-center">
          <p className="text-muted-foreground">Solicitação não encontrada.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const status = statusConfig[request.status] || statusConfig.pending;
  const progressPercent = Math.min(100, (docsCount / 4) * 50 + (['pending', 'in_review', 'matched', 'proposal_sent', 'closed'].indexOf(request.status) + 1) * 10);

  const providerNames = ['Banco A', 'Fundo B', 'Fintech C', 'Family Office D', 'Angel E'];
  const nextSteps: Record<string, string[]> = {
    pending: ['Envie os documentos solicitados', 'Aguarde análise da equipe Vispe'],
    in_review: ['Seus documentos estão sendo analisados', 'Fique atento ao chat para dúvidas'],
    matched: ['Provedores foram identificados', 'Aguarde proposta formal'],
    proposal_sent: ['Revise a proposta recebida', 'Entre em contato para negociar'],
    closed: ['Captação finalizada!'],
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/minhas-captacoes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{request.company_name}</h1>
            <p className="text-sm text-muted-foreground">
              {capitalTypeLabels[request.capital_type] || request.capital_type} · {objectiveLabels[request.objective] || request.objective}
            </p>
          </div>
          <Badge variant={status.variant} className="text-sm px-3 py-1">{status.label}</Badge>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progresso geral</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <CapitalTimeline requestId={id!} currentStatus={request.status} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <CapitalDocChecklist requestId={id!} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <CapitalChat requestId={id!} />
              </CardContent>
            </Card>

            <Button variant="outline" onClick={() => window.print()} className="w-full">
              <Printer className="h-4 w-4 mr-2" /> Baixar Relatório PDF
            </Button>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground">Resumo</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{request.company_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{formatFullCurrency(request.requested_amount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{objectiveLabels[request.objective] || request.objective}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{new Date(request.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Score */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">Score de Aprovação</h3>
                <CapitalScoreCard score={request.lead_score} />
              </CardContent>
            </Card>

            {/* Providers matched */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold text-foreground">Provedores ({matches.length})</h3>
                {matches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum provedor identificado ainda.</p>
                ) : (
                  matches.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{providerNames[i] || `Provedor ${i + 1}`}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-muted rounded-full h-1.5">
                            <div className="bg-accent h-1.5 rounded-full" style={{ width: `${m.match_score || 0}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{m.match_score}%</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {m.status === 'suggested' ? 'Sugerido' : m.status === 'contacted' ? 'Contatado' : m.status === 'interested' ? 'Interessado' : m.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Next steps */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold text-foreground">Próximos Passos</h3>
                <ul className="space-y-2">
                  {(nextSteps[request.status] || nextSteps.pending).map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
