import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Users, TrendingUp, Award, AlertTriangle, Plus, Calendar, Search, Eye, CheckCircle2, XCircle, Clock, Shield, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ReservationCountdown } from '@/components/partner/ReservationCountdown';
import { CockpitHeadPanel } from '@/components/admin/partnerships/CockpitHeadPanel';
import { PartnerManagementTable } from '@/components/admin/partnerships/PartnerManagementTable';
import type { PartnerStatus } from '@/lib/partnershipsTargets';

interface PartnerData {
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  created_at: string;
  listing_count: number;
  avg_equity_score: number | null;
  last_listing_date: string | null;
  is_active: boolean;
  active_reservations: number;
  exclusive_reservations: number;
  avg_vdr_readiness: number | null;
  partner_status: PartnerStatus;
  is_partner_accountant: boolean;
}

interface Reservation {
  id: string;
  partner_user_id: string;
  listing_id: string;
  reserved_at: string;
  expires_at: string;
  status: string;
  commission_type: string;
  qualifying_action: string | null;
  qualified_at: string | null;
  listing_title?: string;
  listing_category?: string;
  listing_vdr_readiness?: number;
  partner_name?: string;
}

interface VdrDoc {
  id: string;
  listing_id: string;
  doc_category: string;
  doc_name: string;
  file_url: string;
  status: string;
  uploaded_by: string;
  created_at: string;
  validated_by: string | null;
  validated_at: string | null;
  rejection_reason: string | null;
  listing_title?: string;
  uploader_name?: string;
}

interface Activity {
  id: string;
  partner_user_id: string;
  activity_type: string;
  notes: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const AdminPartnerships = () => {
  const { user } = useAuth();
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [vdrDocs, setVdrDocs] = useState<VdrDoc[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vdrStatusFilter, setVdrStatusFilter] = useState<string>('all');
  const [reservationFilter, setReservationFilter] = useState<string>('all');
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [drillDownPartner, setDrillDownPartner] = useState<PartnerData | null>(null);
  const [activityForm, setActivityForm] = useState({ type: 'followup', notes: '', scheduled_at: '' });
  const [rejectDocId, setRejectDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [stats, setStats] = useState({
    totalPartners: 0,
    activePartners: 0,
    totalLeads: 0,
    avgEquity: 0,
    inactivePartners: 0,
    icpLeads: 0,
    activeReservations: 0,
    exclusiveReservations: 0,
    conversionRate: 0,
    avgVdrReadiness: 0,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, listingsRes, reservationsRes, vdrRes, actsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, company_name, phone, created_at, partner_status, is_partner_accountant').or('is_partner_accountant.eq.true,partner_status.in.(pending,suspended,disqualified)'),
        supabase.from('listings').select('id, user_id, equity_score, asking_price, created_at, title, category, vdr_readiness'),
        supabase.from('partner_lead_reservations').select('*'),
        supabase.from('vdr_documents').select('*').order('created_at', { ascending: false }),
        supabase.from('partner_activities').select('*').order('created_at', { ascending: false }).limit(200),
      ]);

      const profiles = profilesRes.data || [];
      const allListings = listingsRes.data || [];
      const allReservations = reservationsRes.data || [];
      const allVdr = vdrRes.data || [];
      const allActs = actsRes.data || [];

      if (profiles.length === 0) { setLoading(false); return; }

      const partnerIds = profiles.map(p => p.user_id);
      setActivities(allActs as Activity[]);

      // Enrich reservations
      const enrichedReservations: Reservation[] = allReservations.map(r => {
        const listing = allListings.find(l => l.id === r.listing_id);
        const partner = profiles.find(p => p.user_id === r.partner_user_id);
        return {
          ...r,
          listing_title: listing?.title || 'Sem título',
          listing_category: listing?.category,
          listing_vdr_readiness: listing?.vdr_readiness ?? 0,
          partner_name: partner?.full_name || 'Parceiro',
        } as Reservation;
      });
      setReservations(enrichedReservations);

      // Enrich VDR docs
      const enrichedVdr: VdrDoc[] = allVdr.map(d => {
        const listing = allListings.find(l => l.id === d.listing_id);
        const uploader = profiles.find(p => p.user_id === d.uploaded_by);
        return {
          ...d,
          listing_title: listing?.title || 'Sem título',
          uploader_name: uploader?.full_name || 'Desconhecido',
        } as VdrDoc;
      });
      setVdrDocs(enrichedVdr);

      // Build partner data
      const now = new Date();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const partnerData: PartnerData[] = profiles.map(p => {
        const pListings = allListings.filter(l => l.user_id === p.user_id);
        const scores = pListings.filter(l => l.equity_score != null).map(l => l.equity_score!);
        const lastDate = pListings.length > 0
          ? pListings.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())[0].created_at
          : null;
        const isActive = lastDate ? new Date(lastDate) > sixtyDaysAgo : false;

        const pReservations = allReservations.filter(r => r.partner_user_id === p.user_id);
        const activeRes = pReservations.filter(r => r.status === 'reserved').length;
        const exclusiveRes = pReservations.filter(r => r.status === 'exclusive').length;

        const pListingIds = pListings.map(l => l.id);
        const vdrReadinesses = pListings.filter(l => pListingIds.includes(l.id) && l.vdr_readiness != null).map(l => l.vdr_readiness!);

        return {
          user_id: p.user_id,
          full_name: p.full_name,
          company_name: p.company_name,
          phone: p.phone,
          created_at: p.created_at,
          listing_count: pListings.length,
          avg_equity_score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
          last_listing_date: lastDate,
          is_active: isActive,
          active_reservations: activeRes,
          exclusive_reservations: exclusiveRes,
          avg_vdr_readiness: vdrReadinesses.length > 0 ? Math.round(vdrReadinesses.reduce((a, b) => a + b, 0) / vdrReadinesses.length) : null,
          partner_status: ((p as any).partner_status || 'active') as PartnerStatus,
          is_partner_accountant: !!(p as any).is_partner_accountant,
        };
      });

      partnerData.sort((a, b) => b.listing_count - a.listing_count);
      setPartners(partnerData);

      // Stats
      const activeCount = partnerData.filter(p => p.is_active).length;
      const totalLeads = partnerData.reduce((s, p) => s + p.listing_count, 0);
      const scoresAll = partnerData.filter(p => p.avg_equity_score != null).map(p => p.avg_equity_score!);
      const icpCount = allListings.filter(l => partnerIds.includes(l.user_id) && l.equity_score != null && l.equity_score >= 60).length;
      const totalActiveRes = allReservations.filter(r => r.status === 'reserved').length;
      const totalExclusiveRes = allReservations.filter(r => r.status === 'exclusive').length;
      const totalClosedOrExclusive = allReservations.filter(r => ['exclusive', 'closed_by_matrix'].includes(r.status)).length;
      const totalFinished = allReservations.filter(r => r.status !== 'reserved').length;
      const convRate = totalFinished > 0 ? Math.round((totalClosedOrExclusive / totalFinished) * 100) : 0;
      const allVdrReadiness = allListings.filter(l => l.vdr_readiness != null && l.vdr_readiness > 0).map(l => l.vdr_readiness!);

      setStats({
        totalPartners: partnerData.length,
        activePartners: activeCount,
        totalLeads,
        avgEquity: scoresAll.length > 0 ? Math.round(scoresAll.reduce((a, b) => a + b, 0) / scoresAll.length) : 0,
        inactivePartners: partnerData.length - activeCount,
        icpLeads: icpCount,
        activeReservations: totalActiveRes,
        exclusiveReservations: totalExclusiveRes,
        conversionRate: convRate,
        avgVdrReadiness: allVdrReadiness.length > 0 ? Math.round(allVdrReadiness.reduce((a, b) => a + b, 0) / allVdrReadiness.length) : 0,
      });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados de parcerias');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = async () => {
    if (!selectedPartner || !user) return;
    try {
      const { error } = await supabase.from('partner_activities').insert({
        partner_user_id: selectedPartner,
        activity_type: activityForm.type,
        notes: activityForm.notes || null,
        scheduled_at: activityForm.scheduled_at || null,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success('Atividade registrada!');
      setShowActivityDialog(false);
      setActivityForm({ type: 'followup', notes: '', scheduled_at: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar atividade');
    }
  };

  const handleValidateDoc = async (docId: string) => {
    if (!user) return;
    const { error } = await supabase.from('vdr_documents').update({
      status: 'validated',
      validated_by: user.id,
      validated_at: new Date().toISOString(),
    }).eq('id', docId);
    if (error) { toast.error('Erro ao validar'); return; }
    toast.success('Documento validado!');
    fetchData();
  };

  const handleRejectDoc = async () => {
    if (!rejectDocId || !user) return;
    const { error } = await supabase.from('vdr_documents').update({
      status: 'rejected',
      validated_by: user.id,
      validated_at: new Date().toISOString(),
      rejection_reason: rejectReason,
    }).eq('id', rejectDocId);
    if (error) { toast.error('Erro ao rejeitar'); return; }
    toast.success('Documento rejeitado');
    setRejectDocId(null);
    setRejectReason('');
    fetchData();
  };

  const handleForceExclusive = async (reservationId: string) => {
    const { error } = await supabase.from('partner_lead_reservations').update({
      status: 'exclusive',
      qualifying_action: 'manual_admin',
      qualified_at: new Date().toISOString(),
      commission_type: 'full',
    }).eq('id', reservationId);
    if (error) { toast.error('Erro'); return; }
    toast.success('Exclusividade forçada');
    fetchData();
  };

  const handleCloseByMatrix = async (reservationId: string) => {
    const { error } = await supabase.from('partner_lead_reservations').update({
      status: 'closed_by_matrix',
    }).eq('id', reservationId);
    if (error) { toast.error('Erro'); return; }
    toast.success('Fechado pela Matriz');
    fetchData();
  };

  const filteredPartners = partners.filter(p => {
    const matchesSearch = !searchTerm ||
      (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && p.is_active) ||
      (statusFilter === 'inactive' && !p.is_active);
    return matchesSearch && matchesStatus;
  });

  const filteredReservations = reservations.filter(r => {
    if (reservationFilter === 'all') return true;
    if (reservationFilter === 'expiring_7d') {
      const daysLeft = Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return r.status === 'reserved' && daysLeft <= 7 && daysLeft > 0;
    }
    return r.status === reservationFilter;
  });

  const filteredVdr = vdrDocs.filter(d => vdrStatusFilter === 'all' || d.status === vdrStatusFilter);

  const kanbanColumns = [
    { key: 'reserved', label: 'Reservado', color: 'border-amber-500/30', icon: Clock },
    { key: 'exclusive', label: 'Exclusivo', color: 'border-emerald-500/30', icon: CheckCircle2 },
    { key: 'expired', label: 'Expirado', color: 'border-muted', icon: XCircle },
    { key: 'closed_by_matrix', label: 'Fechado pela Matriz', color: 'border-red-500/30', icon: AlertTriangle },
  ];

  const activityTypeLabels: Record<string, string> = {
    evento: 'Evento', reuniao_agendada: 'Reunião Agendada',
    reuniao_realizada: 'Reunião Realizada', followup: 'Follow-up',
  };

  const docCategoryLabels: Record<string, string> = {
    balanco: 'Balanço', dre: 'DRE', contrato: 'Contrato Social',
    fluxo_caixa: 'Fluxo de Caixa', impostos: 'Impostos', outro: 'Outro',
  };

  const drillDownReservations = drillDownPartner ? reservations.filter(r => r.partner_user_id === drillDownPartner.user_id) : [];
  const drillDownVdr = drillDownPartner ? vdrDocs.filter(d => d.uploaded_by === drillDownPartner.user_id) : [];
  const drillDownActivities = drillDownPartner ? activities.filter(a => a.partner_user_id === drillDownPartner.user_id) : [];

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
      <div className="space-y-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Painel de Parcerias</h1>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="reservations">Reservas de Leads</TabsTrigger>
            <TabsTrigger value="vdr">Cofre Digital (VDR)</TabsTrigger>
          </TabsList>

          {/* ===== TAB 1: OVERVIEW ===== */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card><CardContent className="pt-4 pb-4 text-center">
                <Users className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{stats.totalPartners}</p>
                <p className="text-xs text-muted-foreground">Parceiros</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <TrendingUp className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                <p className="text-2xl font-bold">{stats.activePartners}</p>
                <p className="text-xs text-muted-foreground">Engajados</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                <p className="text-2xl font-bold">{stats.activeReservations}</p>
                <p className="text-xs text-muted-foreground">Reservas Ativas</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                <p className="text-2xl font-bold">{stats.exclusiveReservations}</p>
                <p className="text-xs text-muted-foreground">Exclusivos</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <Shield className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{stats.avgVdrReadiness}%</p>
                <p className="text-xs text-muted-foreground">VDR Médio</p>
              </CardContent></Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar parceiro..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Partners Table */}
            <Card>
              <CardHeader><CardTitle>Ranking de Parceiros</CardTitle></CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Carregando...</p>
                ) : filteredPartners.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum parceiro encontrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Parceiro</TableHead>
                        <TableHead>Leads</TableHead>
                        <TableHead>Equity Médio</TableHead>
                        <TableHead>Reservas</TableHead>
                        <TableHead>VDR</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPartners.map((p, idx) => (
                        <TableRow key={p.user_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDrillDownPartner(p)}>
                          <TableCell className="font-medium">{idx + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{p.full_name || 'Sem nome'}</p>
                              {p.company_name && <p className="text-xs text-muted-foreground">{p.company_name}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{p.listing_count}</TableCell>
                          <TableCell>
                            {p.avg_equity_score != null ? (
                              <Badge variant={p.avg_equity_score >= 60 ? 'default' : 'secondary'}>{p.avg_equity_score}/100</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {p.active_reservations > 0 && <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30">{p.active_reservations} ativas</Badge>}
                              {p.exclusive_reservations > 0 && <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">{p.exclusive_reservations} excl.</Badge>}
                              {p.active_reservations === 0 && p.exclusive_reservations === 0 && '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {p.avg_vdr_readiness != null ? (
                              <Badge variant={p.avg_vdr_readiness >= 80 ? 'default' : 'secondary'}>{p.avg_vdr_readiness}%</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.is_active ? 'default' : 'destructive'}>{p.is_active ? 'Ativo' : 'Inativo'}</Badge>
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => setDrillDownPartner(p)}>
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Dialog open={showActivityDialog && selectedPartner === p.user_id} onOpenChange={(open) => {
                                setShowActivityDialog(open);
                                if (open) setSelectedPartner(p.user_id);
                              }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline"><Plus className="h-3 w-3" /></Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader><DialogTitle>Registrar Atividade — {p.full_name}</DialogTitle></DialogHeader>
                                  <div className="space-y-4">
                                    <Select value={activityForm.type} onValueChange={(v) => setActivityForm(prev => ({ ...prev, type: v }))}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="evento">Evento</SelectItem>
                                        <SelectItem value="reuniao_agendada">Reunião Agendada</SelectItem>
                                        <SelectItem value="reuniao_realizada">Reunião Realizada</SelectItem>
                                        <SelectItem value="followup">Follow-up</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Textarea placeholder="Notas..." value={activityForm.notes} onChange={(e) => setActivityForm(prev => ({ ...prev, notes: e.target.value }))} />
                                    <Input type="datetime-local" value={activityForm.scheduled_at} onChange={(e) => setActivityForm(prev => ({ ...prev, scheduled_at: e.target.value }))} />
                                    <Button onClick={handleCreateActivity} className="w-full">Registrar</Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent Activities */}
            {activities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Atividades Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activities.slice(0, 10).map((act) => {
                      const partner = partners.find(p => p.user_id === act.partner_user_id);
                      return (
                        <div key={act.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                          <div>
                            <p className="text-sm font-medium">
                              {activityTypeLabels[act.activity_type] || act.activity_type}{' — '}{partner?.full_name || 'Parceiro'}
                            </p>
                            {act.notes && <p className="text-xs text-muted-foreground">{act.notes}</p>}
                          </div>
                          <p className="text-xs text-muted-foreground">{new Date(act.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== TAB 2: RESERVATIONS KANBAN ===== */}
          <TabsContent value="reservations" className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <Select value={reservationFilter} onValueChange={setReservationFilter}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="reserved">Reservadas</SelectItem>
                  <SelectItem value="exclusive">Exclusivas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                  <SelectItem value="closed_by_matrix">Fechado pela Matriz</SelectItem>
                  <SelectItem value="expiring_7d">Expirando em 7 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reservationFilter === 'all' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kanbanColumns.map(col => {
                  const colReservations = reservations.filter(r => r.status === col.key);
                  const Icon = col.icon;
                  return (
                    <div key={col.key} className={`border rounded-lg p-3 space-y-3 ${col.color}`}>
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <Icon className="h-4 w-4" />
                        {col.label}
                        <Badge variant="secondary" className="ml-auto">{colReservations.length}</Badge>
                      </div>
                      {colReservations.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma</p>}
                      {colReservations.map(r => (
                        <Card key={r.id} className="!bg-card/80">
                          <CardContent className="p-3 space-y-2">
                            <p className="font-medium text-sm break-words">{r.listing_title}</p>
                            <p className="text-xs text-muted-foreground">{r.partner_name}</p>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px]">{r.commission_type === 'full' ? '20% cheia' : '5% descoberta'}</Badge>
                              <Badge variant="secondary" className="text-[10px]">VDR {r.listing_vdr_readiness}%</Badge>
                            </div>
                            {r.status === 'reserved' && (
                              <ReservationCountdown expiresAt={r.expires_at} reservedAt={r.reserved_at} status="reserved" />
                            )}
                            {r.status === 'reserved' && (
                              <div className="flex gap-1 pt-1">
                                <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => handleForceExclusive(r.id)}>Forçar Exclusivo</Button>
                                <Button size="sm" variant="destructive" className="text-xs flex-1" onClick={() => handleCloseByMatrix(r.id)}>Fechar Matriz</Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReservations.map(r => (
                  <Card key={r.id}>
                    <CardContent className="p-4 space-y-2">
                      <p className="font-medium break-words">{r.listing_title}</p>
                      <p className="text-sm text-muted-foreground">{r.partner_name}</p>
                      <div className="flex items-center gap-2">
                        <ReservationCountdown expiresAt={r.expires_at} reservedAt={r.reserved_at} status={r.status as any} compact />
                        <Badge variant="outline" className="text-[10px]">{r.commission_type === 'full' ? '20%' : '5%'}</Badge>
                      </div>
                      {r.status === 'reserved' && (
                        <div className="flex gap-1 pt-1">
                          <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => handleForceExclusive(r.id)}>Forçar Exclusivo</Button>
                          <Button size="sm" variant="destructive" className="text-xs flex-1" onClick={() => handleCloseByMatrix(r.id)}>Fechar Matriz</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {filteredReservations.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Nenhuma reserva encontrada</p>}
              </div>
            )}
          </TabsContent>

          {/* ===== TAB 3: VDR ===== */}
          <TabsContent value="vdr" className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <Select value={vdrStatusFilter} onValueChange={setVdrStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="validated">Validados</SelectItem>
                  <SelectItem value="rejected">Rejeitados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Documentos VDR</CardTitle></CardHeader>
              <CardContent>
                {filteredVdr.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum documento encontrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Enviado por</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVdr.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium break-words max-w-[150px]">{d.listing_title}</TableCell>
                          <TableCell>{docCategoryLabels[d.doc_category] || d.doc_category}</TableCell>
                          <TableCell className="text-sm break-words max-w-[150px]">{d.doc_name}</TableCell>
                          <TableCell className="text-sm">{d.uploader_name}</TableCell>
                          <TableCell>
                            <Badge variant={d.status === 'validated' ? 'default' : d.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {d.status === 'validated' ? 'Validado' : d.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                            </Badge>
                            {d.rejection_reason && <p className="text-[10px] text-destructive mt-1">{d.rejection_reason}</p>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>
                            {d.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => handleValidateDoc(d.id)}>
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                </Button>
                                <Dialog open={rejectDocId === d.id} onOpenChange={(open) => { if (!open) { setRejectDocId(null); setRejectReason(''); } }}>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={() => setRejectDocId(d.id)}>
                                      <XCircle className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader><DialogTitle>Rejeitar Documento</DialogTitle></DialogHeader>
                                    <Textarea placeholder="Motivo da rejeição..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                                    <Button onClick={handleRejectDoc} variant="destructive" className="w-full">Confirmar Rejeição</Button>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            )}
                            {d.status !== 'pending' && <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ===== DRILL-DOWN SHEET ===== */}
        <Sheet open={!!drillDownPartner} onOpenChange={(open) => { if (!open) setDrillDownPartner(null); }}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            {drillDownPartner && (
              <>
                <SheetHeader>
                  <SheetTitle>{drillDownPartner.full_name || 'Parceiro'}</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  {/* Profile Info */}
                  <Card>
                    <CardContent className="pt-4 space-y-2">
                      <p className="text-sm"><span className="font-medium">Empresa:</span> {drillDownPartner.company_name || '—'}</p>
                      <p className="text-sm"><span className="font-medium">Telefone:</span> {drillDownPartner.phone || '—'}</p>
                      <p className="text-sm"><span className="font-medium">Desde:</span> {new Date(drillDownPartner.created_at).toLocaleDateString('pt-BR')}</p>
                      <div className="flex gap-2 pt-1">
                        <Badge variant={drillDownPartner.is_active ? 'default' : 'destructive'}>{drillDownPartner.is_active ? 'Ativo' : 'Inativo'}</Badge>
                        <Badge variant="secondary">{drillDownPartner.listing_count} leads</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Reservations */}
                  <div>
                    <h3 className="font-semibold mb-2">Reservas ({drillDownReservations.length})</h3>
                    {drillDownReservations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma reserva</p>
                    ) : (
                      <div className="space-y-2">
                        {drillDownReservations.map(r => (
                          <Card key={r.id} className="!bg-card/80">
                            <CardContent className="p-3 space-y-1">
                              <p className="text-sm font-medium break-words">{r.listing_title}</p>
                              <div className="flex items-center gap-2">
                                <ReservationCountdown expiresAt={r.expires_at} reservedAt={r.reserved_at} status={r.status as any} compact />
                                <Badge variant="outline" className="text-[10px]">{r.commission_type === 'full' ? '20%' : '5%'}</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* VDR Docs */}
                  <div>
                    <h3 className="font-semibold mb-2">Documentos VDR ({drillDownVdr.length})</h3>
                    {drillDownVdr.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum documento</p>
                    ) : (
                      <div className="space-y-2">
                        {drillDownVdr.map(d => (
                          <div key={d.id} className="flex items-center justify-between border-b border-border pb-2">
                            <div>
                              <p className="text-sm font-medium">{docCategoryLabels[d.doc_category] || d.doc_category}</p>
                              <p className="text-xs text-muted-foreground">{d.listing_title}</p>
                            </div>
                            <Badge variant={d.status === 'validated' ? 'default' : d.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {d.status === 'validated' ? 'OK' : d.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Activities */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Atividades ({drillDownActivities.length})</h3>
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedPartner(drillDownPartner.user_id);
                        setShowActivityDialog(true);
                      }}>
                        <Plus className="h-3 w-3 mr-1" />Nova
                      </Button>
                    </div>
                    {drillDownActivities.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma atividade</p>
                    ) : (
                      <div className="space-y-2">
                        {drillDownActivities.slice(0, 10).map(a => (
                          <div key={a.id} className="border-b border-border pb-2">
                            <p className="text-sm font-medium">{activityTypeLabels[a.activity_type] || a.activity_type}</p>
                            {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                            <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default AdminPartnerships;
