import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { PublicFooter as Footer } from '@/components/layout/PublicFooter';
import { useAuth } from '@/contexts/AuthContext';
import { usePartnerAccountant } from '@/hooks/usePartnerAccountant';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ReservationCountdown } from '@/components/partner/ReservationCountdown';
import { VDRUploader } from '@/components/partner/VDRUploader';
import { Briefcase, Clock, CheckCircle2, AlertTriangle, FolderOpen, Calculator, ArrowRight, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

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
    id: string;
    title: string;
    category: string;
    city: string | null;
    state: string | null;
    asking_price: number | null;
    vdr_readiness: number | null;
  } | null;
}

export default function PartnerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isPartnerAccountant, loading: roleLoading } = usePartnerAccountant();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [vdrListingId, setVdrListingId] = useState<string | null>(null);
  const [vdrListingTitle, setVdrListingTitle] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('partner_lead_reservations')
        .select(`
          id, listing_id, reserved_at, expires_at, status, qualifying_action, qualified_at, commission_type,
          listing:listings(id, title, category, city, state, asking_price, vdr_readiness)
        `)
        .eq('partner_user_id', user.id)
        .order('expires_at', { ascending: true });
      setReservations((data ?? []) as any);
      setLoading(false);
    };
    load();
  }, [user]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isPartnerAccountant) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-20 max-w-2xl text-center">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso restrito a Contadores Parceiros</h1>
          <p className="text-muted-foreground mb-6">Esta área é exclusiva para contadores parceiros credenciados pela PME.B3.</p>
          <Button onClick={() => navigate('/')} className="bg-accent hover:bg-accent/90 text-accent-foreground">Voltar</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const reserved = reservations.filter(r => r.status === 'reserved');
  const exclusive = reservations.filter(r => r.status === 'exclusive');
  const expiring = reserved.filter(r => {
    const days = Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 7;
  });
  const expired = reservations.filter(r => r.status === 'expired' || r.status === 'closed_by_matrix');

  const conversionRate = reservations.length > 0
    ? Math.round((exclusive.length / reservations.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-28 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-accent" />
            Painel do Contador Parceiro
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie suas reservas de leads, qualificações e o Cofre Digital.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Clock className="w-5 h-5" />} label="Reservados" value={reserved.length} color="text-blue-400" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Exclusivos" value={exclusive.length} color="text-emerald-400" />
          <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Expirando ≤ 7d" value={expiring.length} color="text-red-400" />
          <StatCard icon={<ArrowRight className="w-5 h-5" />} label="Conversão" value={`${conversionRate}%`} color="text-accent" />
        </div>

        {/* Lista */}
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
                                size="sm"
                                variant="outline"
                                className="bg-transparent"
                                onClick={() => {
                                  setVdrListingId(r.listing!.id);
                                  setVdrListingTitle(r.listing!.title);
                                }}
                              >
                                <FolderOpen className="w-3 h-3 mr-1" />
                                Cofre Digital
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-transparent"
                                onClick={() => navigate('/valuation')}
                              >
                                <Calculator className="w-3 h-3 mr-1" />
                                Gerar Valuation
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
      </main>

      {/* VDR Modal */}
      <Dialog open={!!vdrListingId} onOpenChange={(o) => !o && setVdrListingId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto !bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-foreground">Cofre Digital</DialogTitle>
          </DialogHeader>
          {vdrListingId && <VDRUploader listingId={vdrListingId} listingTitle={vdrListingTitle} />}
        </DialogContent>
      </Dialog>

      <Footer />
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
