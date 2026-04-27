import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveRoles';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReservationCountdown } from '@/components/partner/ReservationCountdown';
import { VDRUploader } from '@/components/partner/VDRUploader';
import { SharedOpportunityCard, type PoolOpportunity } from '@/components/partner/SharedOpportunityCard';
import { InterestModal } from '@/components/partner/InterestModal';
import { BulkUploadDialog, downloadTemplate } from '@/components/sell/BulkUploadDialog';
import {
  Briefcase, Clock, CheckCircle2, AlertTriangle, FolderOpen,
  Calculator, ArrowRight, Loader2, Handshake, Search, Flame,
  Upload, Download, Plus, Sparkles,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { categories } from '@/data/mockData';

interface ReservationRow {
  id: string;
  listing_id: string;
  reserved_at: string;
  expires_at: string;
  status: 'reserved' | 'exclusive' | 'expired' | 'closed_by_matrix';
  qualifying_action: string | null;
  qualified_at: string | null;
  commission_type: string;
  listing: {
    id: string; title: string; category: string;
    city: string | null; state: string | null;
    asking_price: number | null; vdr_readiness: number | null;
    annual_revenue: number | null; equity_score: number | null;
  } | null;
  interest_count?: number;
}

export default function PartnerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const eff = useEffectiveRoles();
  const navigate = useNavigate();

  // Acesso liberado para parceiros, franqueados, advisors e admins
  const hasAccess = eff.isPartnerAccountant || eff.isAdvisor || eff.isFranchisee || eff.isAdmin;

  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [vdrListingId, setVdrListingId] = useState<string | null>(null);
  const [vdrListingTitle, setVdrListingTitle] = useState<string>('');
  const [bulkOpen, setBulkOpen] = useState(false);

  // Pool
  const [pool, setPool] = useState<PoolOpportunity[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set());
  const [interestModalOpp, setInterestModalOpp] = useState<PoolOpportunity | null>(null);
  const [poolSearch, setPoolSearch] = useState('');
  const [poolCategory, setPoolCategory] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?redirect=/parceiro');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    setPoolLoading(true);
    const [reservRes, poolRes, mineRes] = await Promise.all([
      supabase
        .from('partner_lead_reservations')
        .select(`id, listing_id, reserved_at, expires_at, status, qualifying_action, qualified_at, commission_type,
                 listing:listings(id, title, category, city, state, asking_price, vdr_readiness, annual_revenue, equity_score)`)
        .eq('partner_user_id', user!.id)
        .order('expires_at', { ascending: true }),
      supabase
        .from('partner_opportunity_pool' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('partner_opportunity_interests')
        .select('listing_id')
        .eq('interested_user_id', user!.id),
    ]);

    setReservations((reservRes.data ?? []) as any);
    setPool(((poolRes.data ?? []) as unknown as PoolOpportunity[]).filter(o => !o.is_my_lead));
    setMyInterests(new Set((mineRes.data ?? []).map((r: any) => r.listing_id)));
    setLoading(false);
    setPoolLoading(false);
  }

  async function expressInterest(opp: PoolOpportunity, buyerDesc: string) {
    if (!user) return;
    // Buscar o originator_user_id (não exposto na view por privacidade)
    const { data: listing } = await supabase
      .from('listings').select('user_id').eq('id', opp.id).maybeSingle();
    if (!listing?.user_id) {
      toast.error('Não foi possível registrar o interesse.');
      return;
    }
    const { error } = await supabase
      .from('partner_opportunity_interests')
      .insert({
        listing_id: opp.id,
        interested_user_id: user.id,
        originator_user_id: listing.user_id,
        buyer_description: buyerDesc || null,
      });
    if (error) {
      toast.error('Erro ao registrar interesse', { description: error.message });
      return;
    }
    toast.success('Interesse registrado!', {
      description: 'O originador foi notificado e responderá em breve.',
    });
    setInterestModalOpp(null);
    setMyInterests(prev => new Set([...prev, opp.id]));
    setPool(prev => prev.map(p => p.id === opp.id ? { ...p, interest_count: p.interest_count + 1 } : p));
  }

  if (authLoading || eff.loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center mt-12">
        <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Painel restrito a parceiros, franqueados e assessores
        </h1>
        <p className="text-muted-foreground mb-6">
          Esta área é exclusiva para parceiros credenciados pela PME.B3.
        </p>
        <Button onClick={() => navigate('/painel')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          Voltar ao painel
        </Button>
      </div>
    );
  }

  // Stats das reservas próprias
  const reserved = reservations.filter(r => r.status === 'reserved');
  const exclusive = reservations.filter(r => r.status === 'exclusive');
  const expiring = reserved.filter(r => {
    const days = Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 7;
  });
  const conversionRate = reservations.length > 0
    ? Math.round((exclusive.length / reservations.length) * 100)
    : 0;

  // Pool filtrado
  const filteredPool = useMemo(() => {
    return pool.filter(o => {
      if (poolCategory !== 'all' && o.category !== poolCategory) return false;
      if (poolSearch.trim()) {
        const q = poolSearch.trim().toLowerCase();
        const haystack = `${o.title} ${o.description ?? ''} ${o.city ?? ''} ${o.state ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [pool, poolSearch, poolCategory]);

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-accent" />
          Painel do Parceiro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie suas reservas e descubra oportunidades de match na rede.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Clock className="w-5 h-5" />} label="Reservados" value={reserved.length} color="text-blue-400" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Exclusivos" value={exclusive.length} color="text-emerald-400" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Expirando ≤ 7d" value={expiring.length} color="text-red-400" />
        <StatCard icon={<ArrowRight className="w-5 h-5" />} label="Conversão" value={`${conversionRate}%`} color="text-accent" />
      </div>

      <Tabs defaultValue="my-leads" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-xl">
          <TabsTrigger value="my-leads" className="gap-2">
            <Briefcase className="w-3.5 h-3.5" />Meus Leads
          </TabsTrigger>
          <TabsTrigger value="pool" className="gap-2">
            <Handshake className="w-3.5 h-3.5" />Pool da Rede
            {pool.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4">{pool.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* MEUS LEADS */}
        <TabsContent value="my-leads">
          <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-foreground">Meus Leads Reservados</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : reservations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma reserva ainda. Cadastre um anúncio para iniciar uma reserva de 45 dias.</p>
                  <Button onClick={() => navigate('/vender')} className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground">
                    Cadastrar empresa
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {reservations.map((r) => (
                    <div key={r.id} className="border border-slate-700/40 rounded-lg p-4 bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground break-words">{r.listing?.title ?? 'Anúncio removido'}</h3>
                            <Badge variant="outline" className="bg-transparent text-xs">{r.listing?.category}</Badge>
                            {r.commission_type === 'full' && <Badge className="bg-accent/15 text-accent border-accent/30 text-xs">20% comissão</Badge>}
                            {r.commission_type === 'discovery_fee' && <Badge className="bg-muted text-muted-foreground text-xs">Taxa de descoberta</Badge>}
                            {!!r.interest_count && r.interest_count > 0 && (
                              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs gap-1">
                                <Flame className="w-3 h-3" />{r.interest_count} parceiro{r.interest_count > 1 ? 's' : ''} interessado{r.interest_count > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {r.listing?.city && r.listing?.state ? `${r.listing.city}/${r.listing.state} · ` : ''}
                            Reservado em {formatDate(r.reserved_at)}
                          </p>
                          {r.listing?.vdr_readiness != null && r.listing.vdr_readiness > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              VDR: <span className="text-accent font-medium">{r.listing.vdr_readiness}%</span>
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <ReservationCountdown
                            expiresAt={r.expires_at}
                            reservedAt={r.reserved_at}
                            status={r.status}
                          />
                          <div className="flex gap-2 flex-wrap justify-end">
                            {r.listing && (
                              <>
                                <Button
                                  size="sm" variant="outline" className="bg-transparent"
                                  onClick={() => { setVdrListingId(r.listing!.id); setVdrListingTitle(r.listing!.title); }}
                                >
                                  <FolderOpen className="w-3 h-3 mr-1" />Cofre Digital
                                </Button>
                                <Button
                                  size="sm" variant="outline" className="bg-transparent"
                                  onClick={() => navigate('/valuation')}
                                >
                                  <Calculator className="w-3 h-3 mr-1" />Gerar Valuation
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {r.status === 'reserved' && (
                        <p className="text-xs text-amber-400 mt-3 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Para garantir exclusividade (20% de comissão), suba um documento no Cofre Digital ou gere um valuation.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* POOL DA REDE */}
        <TabsContent value="pool">
          <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Handshake className="w-5 h-5 text-accent" />
                Pool de Oportunidades da Rede
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Teasers anônimos de leads cadastrados por outros parceiros, franqueados, assessores e BDRs.
                Tem comprador? Marque interesse — comissão dividida 50/50 com quem cadastrou.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título, cidade ou descrição…"
                    value={poolSearch}
                    onChange={(e) => setPoolSearch(e.target.value)}
                    className="pl-9 bg-slate-950 border-slate-700"
                  />
                </div>
                <Select value={poolCategory} onValueChange={setPoolCategory}>
                  <SelectTrigger className="w-full sm:w-56 bg-slate-950 border-slate-700">
                    <SelectValue placeholder="Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os setores</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {poolLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : filteredPool.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Handshake className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma oportunidade no pool corresponde aos filtros.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {filteredPool.map(o => (
                    <SharedOpportunityCard
                      key={o.id}
                      opportunity={o}
                      alreadyInterested={myInterests.has(o.id)}
                      onExpressInterest={(opp) => setInterestModalOpp(opp)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* VDR Modal */}
      <Dialog open={!!vdrListingId} onOpenChange={(o) => !o && setVdrListingId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto !bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-foreground">Cofre Digital</DialogTitle>
          </DialogHeader>
          {vdrListingId && <VDRUploader listingId={vdrListingId} listingTitle={vdrListingTitle} />}
        </DialogContent>
      </Dialog>

      {/* Interest Modal */}
      <InterestModal
        open={!!interestModalOpp}
        onOpenChange={(o) => !o && setInterestModalOpp(null)}
        opportunityTitle={interestModalOpp?.title ?? ''}
        onConfirm={async (desc) => {
          if (interestModalOpp) await expressInterest(interestModalOpp, desc);
        }}
      />
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-700/50">
      <CardContent className="p-4">
        <div className={`flex items-center gap-2 ${color} mb-2`}>{icon}<span className="text-xs uppercase tracking-wide">{label}</span></div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}
