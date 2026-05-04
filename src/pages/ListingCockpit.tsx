import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Building2, DollarSign, MapPin, Calendar, Printer, Pencil,
  MessageCircle, Eye, Share2,
} from 'lucide-react';
import { formatFullCurrency } from '@/lib/formatters';
import { ListingTimeline } from '@/components/listing/ListingTimeline';
import { EntityDocChecklist } from '@/components/shared/EntityDocChecklist';
import { CapitalScoreCard } from '@/components/capital/CapitalScoreCard';
import { getWhatsAppLink } from '@/lib/whatsapp';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  active: { label: 'Publicado', variant: 'default' },
  paused: { label: 'Pausado', variant: 'outline' },
  sold: { label: 'Vendido', variant: 'destructive' },
};

interface InterestRow {
  id: string;
  interested_user_id: string;
  buyer_description: string | null;
  status: string;
  created_at: string;
}

export default function ListingCockpit() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [docsCount, setDocsCount] = useState(0);
  const [interests, setInterests] = useState<InterestRow[]>([]);
  const [viewsCount, setViewsCount] = useState(0);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!id) return;
    fetchData();
  }, [user, id]);

  const fetchData = async () => {
    const [lRes, dRes, iRes, vRes] = await Promise.all([
      supabase.from('listings').select('*').eq('id', id!).single(),
      supabase.from('listing_financial_docs').select('id', { count: 'exact', head: true }).eq('listing_id', id!),
      supabase.from('partner_opportunity_interests')
        .select('id, interested_user_id, buyer_description, status, created_at')
        .eq('listing_id', id!)
        .order('created_at', { ascending: false }),
      supabase.from('listing_views').select('id', { count: 'exact', head: true }).eq('listing_id', id!),
    ]);
    if (lRes.data) setListing(lRes.data);
    setDocsCount(dRes.count ?? 0);
    if (iRes.data) setInterests(iRes.data as InterestRow[]);
    setViewsCount(vRes.count ?? 0);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Anúncio não encontrado.</p>
      </div>
    );
  }

  if (listing.user_id !== user?.id) {
    // simple ownership check (admins also blocked here intentionally; use marketplace view)
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Você não tem acesso a este cockpit.</p>
      </div>
    );
  }

  const status = statusConfig[listing.status || 'pending'] || statusConfig.pending;

  // Progress = status base (40 if active, 20 pending) + docs (up to 40) + has equity_score (20)
  let progress = 0;
  if (listing.status === 'active') progress += 40;
  else if (listing.status === 'pending') progress += 15;
  else if (listing.status === 'sold') progress = 100;
  progress += Math.min(40, docsCount * 10);
  if (listing.equity_score && listing.equity_score > 0) progress += 20;
  progress = Math.min(100, progress);

  const nextStepsByStatus: Record<string, string[]> = {
    pending: [
      'Envie documentos para acelerar a publicação do seu anúncio',
      'Complete dados financeiros para gerar seu Equity Score',
      'Após análise, publicaremos para nossa rede de compradores qualificados',
    ],
    active: [
      'Seu anúncio está visível no marketplace para compradores qualificados',
      'Compradores compatíveis recebem alerta automático sobre sua empresa',
      'Acompanhe os interessados nesta tela e converse via WhatsApp',
    ],
    paused: [
      'Anúncio temporariamente pausado — reative para voltar a receber leads',
      'Aproveite para atualizar fotos, descrição ou ticket',
    ],
    sold: ['Parabéns! Anúncio finalizado com sucesso.'],
  };
  const nextSteps = nextStepsByStatus[listing.status || 'pending'] || nextStepsByStatus.pending;

  const handlePrint = () => window.print();

  const whatsappMsg = `Olá! Quero falar sobre o anúncio "${listing.codename || listing.title}" no painel mari.`;
  const whatsappUrl = getWhatsAppLink(whatsappMsg);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 print:py-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 print:hidden">
          <Button variant="ghost" size="icon" onClick={() => navigate('/meus-anuncios')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground break-words">
              {listing.codename ? `${listing.codename} · ` : ''}{listing.title}
            </h1>
            <p className="text-sm text-muted-foreground break-words">{listing.category}</p>
          </div>
          <Badge variant={status.variant} className="text-sm px-3 py-1">{status.label}</Badge>
          <Button variant="outline" size="sm" onClick={() => navigate(`/editar-anuncio/${listing.id}`)} className="bg-transparent">
            <Pencil className="h-4 w-4 mr-2" /> Editar
          </Button>
        </div>

        {/* Progress */}
        <div className="mb-4 print:hidden">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progresso geral</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <ListingTimeline status={listing.status || 'pending'} interestCount={interests.length} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <EntityDocChecklist scope="listing" entityId={listing.id} onDocsChange={(c) => setDocsCount(c)} />
              </CardContent>
            </Card>

            <Card className="print:hidden">
              <CardContent className="p-6 text-center space-y-3">
                <h3 className="font-semibold text-foreground">Fale com um Analista</h3>
                <p className="text-sm text-muted-foreground break-words">
                  Tire dúvidas, peça revisão do anúncio ou negocie diretamente com nosso time.
                </p>
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" /> Conversar via WhatsApp
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground">Atendimento de segunda a sexta, das 9h às 18h</p>
              </CardContent>
            </Card>

            <Button variant="outline" onClick={handlePrint} className="w-full bg-transparent print:hidden">
              <Printer className="h-4 w-4 mr-2" /> Baixar Relatório PDF
            </Button>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground">Resumo</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-foreground break-words">{listing.codename || listing.title}</span>
                  </div>
                  {listing.annual_revenue && (
                    <div className="flex items-start gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-foreground">Faturamento: {formatFullCurrency(listing.annual_revenue)}/ano</span>
                    </div>
                  )}
                  {listing.asking_price && !listing.hide_price && (
                    <div className="flex items-start gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-foreground">Ticket: {formatFullCurrency(listing.asking_price)}</span>
                    </div>
                  )}
                  {(listing.city || listing.state) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-foreground break-words">{[listing.city, listing.state].filter(Boolean).join(' · ')}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-foreground">{new Date(listing.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-foreground">{viewsCount} visualizaç{viewsCount === 1 ? 'ão' : 'ões'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">Equity Score</h3>
                <CapitalScoreCard score={listing.equity_score ?? null} />
                {(!listing.equity_score || listing.equity_score === 0) && (
                  <p className="text-xs text-muted-foreground mt-3 text-center break-words">
                    Envie documentos ou faça um Valuation para calcular seu Equity Score.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Compradores Interessados ({interests.length})</h3>
                  {listing.id && (
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/matching-compradores/${listing.id}`)}>
                      Ver matches
                    </Button>
                  )}
                </div>
                {interests.length === 0 ? (
                  <p className="text-sm text-muted-foreground break-words">
                    Nenhum interessado ainda. Compradores compatíveis serão notificados automaticamente.
                  </p>
                ) : (
                  interests.slice(0, 5).map((it) => (
                    <div key={it.id} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">Comprador anônimo</p>
                        <Badge variant="secondary" className="text-[10px]">{it.status}</Badge>
                      </div>
                      {it.buyer_description && (
                        <p className="text-xs text-muted-foreground break-words">{it.buyer_description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(it.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold text-foreground">Próximos Passos</h3>
                <ul className="space-y-2">
                  {nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      <span className="break-words">{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {listing.ticker && (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <h3 className="font-semibold text-foreground">Distribuição</h3>
                  <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={() => navigate(`/teaser/${listing.ticker}`)}>
                    <Share2 className="h-4 w-4 mr-2" /> Ver Blind Teaser
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          header, footer, .print\\:hidden { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
