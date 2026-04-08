import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Users, TrendingUp, Award, AlertTriangle, Plus, Calendar, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PartnerData {
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
  listing_count: number;
  avg_equity_score: number | null;
  last_listing_date: string | null;
  is_active: boolean;
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState({ type: 'followup', notes: '', scheduled_at: '' });

  const [stats, setStats] = useState({
    totalPartners: 0,
    activePartners: 0,
    totalLeads: 0,
    avgEquity: 0,
    inactivePartners: 0,
    icpLeads: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get all partner accountants
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, company_name, created_at')
        .eq('is_partner_accountant', true);

      if (!profiles || profiles.length === 0) {
        setLoading(false);
        return;
      }

      const partnerIds = profiles.map(p => p.user_id);

      // Get listings by partners
      const { data: listings } = await supabase
        .from('listings')
        .select('user_id, equity_score, created_at')
        .in('user_id', partnerIds);

      // Get activities
      const { data: acts } = await supabase
        .from('partner_activities')
        .select('*')
        .in('partner_user_id', partnerIds)
        .order('created_at', { ascending: false })
        .limit(100);

      setActivities((acts || []) as Activity[]);

      const now = new Date();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const partnerData: PartnerData[] = profiles.map(p => {
        const pListings = (listings || []).filter(l => l.user_id === p.user_id);
        const scores = pListings.filter(l => l.equity_score != null).map(l => l.equity_score!);
        const lastDate = pListings.length > 0
          ? pListings.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())[0].created_at
          : null;
        const isActive = lastDate ? new Date(lastDate) > sixtyDaysAgo : false;

        return {
          user_id: p.user_id,
          full_name: p.full_name,
          company_name: p.company_name,
          created_at: p.created_at,
          listing_count: pListings.length,
          avg_equity_score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
          last_listing_date: lastDate,
          is_active: isActive,
        };
      });

      partnerData.sort((a, b) => b.listing_count - a.listing_count);
      setPartners(partnerData);

      const activeCount = partnerData.filter(p => p.is_active).length;
      const totalLeads = partnerData.reduce((s, p) => s + p.listing_count, 0);
      const scoresAll = partnerData.filter(p => p.avg_equity_score != null).map(p => p.avg_equity_score!);
      const icpCount = (listings || []).filter(l => l.equity_score != null && l.equity_score >= 60).length;

      setStats({
        totalPartners: partnerData.length,
        activePartners: activeCount,
        totalLeads,
        avgEquity: scoresAll.length > 0 ? Math.round(scoresAll.reduce((a, b) => a + b, 0) / scoresAll.length) : 0,
        inactivePartners: partnerData.length - activeCount,
        icpLeads: icpCount,
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

  const filteredPartners = partners.filter(p => {
    const matchesSearch = !searchTerm ||
      (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && p.is_active) ||
      (statusFilter === 'inactive' && !p.is_active);
    return matchesSearch && matchesStatus;
  });

  const activityTypeLabels: Record<string, string> = {
    evento: 'Evento',
    reuniao_agendada: 'Reunião Agendada',
    reuniao_realizada: 'Reunião Realizada',
    followup: 'Follow-up',
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Painel de Parcerias</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Users className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{stats.totalPartners}</p>
              <p className="text-xs text-muted-foreground">Parceiros</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
              <p className="text-2xl font-bold">{stats.activePartners}</p>
              <p className="text-xs text-muted-foreground">Engajados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{stats.totalLeads}</p>
              <p className="text-xs text-muted-foreground">Leads Totais</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Award className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <p className="text-2xl font-bold">{stats.avgEquity || '—'}</p>
              <p className="text-xs text-muted-foreground">Equity Médio</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.icpLeads}</p>
              <p className="text-xs text-muted-foreground">Leads ICP</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" />
              <p className="text-2xl font-bold">{stats.inactivePartners}</p>
              <p className="text-xs text-muted-foreground">Inativos</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar parceiro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Partners Table */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking de Parceiros</CardTitle>
          </CardHeader>
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
                    <TableHead>Última Atividade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.map((p, idx) => (
                    <TableRow key={p.user_id}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{p.full_name || 'Sem nome'}</p>
                          {p.company_name && (
                            <p className="text-xs text-muted-foreground">{p.company_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{p.listing_count}</TableCell>
                      <TableCell>
                        {p.avg_equity_score != null ? (
                          <Badge variant={p.avg_equity_score >= 60 ? 'default' : 'secondary'}>
                            {p.avg_equity_score}/100
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.last_listing_date
                          ? new Date(p.last_listing_date).toLocaleDateString('pt-BR')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? 'default' : 'destructive'}>
                          {p.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog open={showActivityDialog && selectedPartner === p.user_id} onOpenChange={(open) => {
                          setShowActivityDialog(open);
                          if (open) setSelectedPartner(p.user_id);
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Plus className="h-3 w-3 mr-1" />
                              Atividade
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Registrar Atividade — {p.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Select value={activityForm.type} onValueChange={(v) => setActivityForm(prev => ({ ...prev, type: v }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="evento">Evento</SelectItem>
                                  <SelectItem value="reuniao_agendada">Reunião Agendada</SelectItem>
                                  <SelectItem value="reuniao_realizada">Reunião Realizada</SelectItem>
                                  <SelectItem value="followup">Follow-up</SelectItem>
                                </SelectContent>
                              </Select>
                              <Textarea
                                placeholder="Notas..."
                                value={activityForm.notes}
                                onChange={(e) => setActivityForm(prev => ({ ...prev, notes: e.target.value }))}
                              />
                              <Input
                                type="datetime-local"
                                value={activityForm.scheduled_at}
                                onChange={(e) => setActivityForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                              />
                              <Button onClick={handleCreateActivity} className="w-full">
                                Registrar
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
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
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.slice(0, 10).map((act) => {
                  const partner = partners.find(p => p.user_id === act.partner_user_id);
                  return (
                    <div key={act.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium">
                          {activityTypeLabels[act.activity_type] || act.activity_type}
                          {' — '}
                          {partner?.full_name || 'Parceiro'}
                        </p>
                        {act.notes && <p className="text-xs text-muted-foreground">{act.notes}</p>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(act.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPartnerships;
