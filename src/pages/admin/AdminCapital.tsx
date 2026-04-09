import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { CapitalChat } from '@/components/capital/CapitalChat';
import { CapitalTimeline } from '@/components/capital/CapitalTimeline';
import { CapitalScoreCard } from '@/components/capital/CapitalScoreCard';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import {
  AlertTriangle, Download, Users, TrendingUp, DollarSign, Clock,
  Search, UserPlus, ArrowUpCircle, Send, Settings
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUSES = ['pending', 'in_review', 'matched', 'proposal_sent', 'closed'] as const;
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  in_review: 'Em Análise',
  matched: 'Matched',
  proposal_sent: 'Proposta Enviada',
  closed: 'Fechado',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  in_review: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  matched: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  proposal_sent: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  closed: 'bg-muted text-muted-foreground border-border',
};

type CapitalRequest = {
  id: string;
  company_name: string;
  requested_amount: number;
  capital_type: string;
  status: string;
  lead_score: number | null;
  sla_deadline: string | null;
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  objective: string;
  monthly_revenue: string | null;
  net_profit: string | null;
  sector: string | null;
  company_age: string | null;
  matched_providers_count: number | null;
  views_count: number;
  success_fee_pct: number | null;
  source: string | null;
};

export default function AdminCapital() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<CapitalRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSlaExpired, setFilterSlaExpired] = useState(false);
  const [scoreRange, setScoreRange] = useState([0, 100]);
  const [proposalText, setProposalText] = useState('');
  const [showProposal, setShowProposal] = useState(false);
  const [activeTab, setActiveTab] = useState('kanban');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-capital-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capital_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CapitalRequest[];
    },
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ['integrations-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('integrations_config').select('*');
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('capital_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      // Insert timeline event
      await supabase.from('capital_timeline').insert({
        request_id: id,
        event_type: 'status_change',
        description: `Status alterado para: ${STATUS_LABELS[status]}`,
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-capital-requests'] });
      toast.success('Status atualizado');
    },
  });

  const assignToMe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('capital_requests')
        .update({ assigned_admin_id: user?.id })
        .eq('id', id);
      if (error) throw error;
      await supabase.from('capital_timeline').insert({
        request_id: id,
        event_type: 'assigned',
        description: 'Analista atribuído ao lead',
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-capital-requests'] });
      toast.success('Lead atribuído a você');
    },
  });

  const sendProposal = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      await supabase
        .from('capital_requests')
        .update({ status: 'proposal_sent' })
        .eq('id', id);
      await supabase.from('capital_timeline').insert({
        request_id: id,
        event_type: 'proposal_sent',
        description: text,
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-capital-requests'] });
      setShowProposal(false);
      setProposalText('');
      toast.success('Proposta enviada');
    },
  });

  const escalate = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('capital_timeline').insert({
        request_id: id,
        event_type: 'escalated',
        description: 'Lead escalado para revisão urgente',
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-capital-requests'] });
      toast.success('Lead escalado');
    },
  });

  const saveIntegration = useMutation({
    mutationFn: async ({ key, value, active }: { key: string; value: string; active: boolean }) => {
      const { error } = await supabase
        .from('integrations_config')
        .upsert({ key, value, active }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations-config'] });
      toast.success('Integração salva');
    },
  });

  const now = new Date();
  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (searchTerm && !r.company_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterType !== 'all' && r.capital_type !== filterType) return false;
      if (filterSlaExpired && (!r.sla_deadline || new Date(r.sla_deadline) > now)) return false;
      if ((r.lead_score ?? 0) < scoreRange[0] || (r.lead_score ?? 0) > scoreRange[1]) return false;
      return true;
    });
  }, [requests, searchTerm, filterType, filterSlaExpired, scoreRange]);

  const byStatus = useMemo(() => {
    const map: Record<string, CapitalRequest[]> = {};
    STATUSES.forEach((s) => (map[s] = []));
    filtered.forEach((r) => {
      if (map[r.status]) map[r.status].push(r);
      else if (!map[r.status]) map.pending.push(r);
    });
    return map;
  }, [filtered]);

  // Metrics
  const totalLeads = requests.length;
  const slaExpired = requests.filter(
    (r) => r.sla_deadline && new Date(r.sla_deadline) < now && r.status !== 'closed'
  ).length;
  const avgTicket = totalLeads > 0 ? requests.reduce((s, r) => s + r.requested_amount, 0) / totalLeads : 0;
  const closedReqs = requests.filter((r) => r.status === 'closed');
  const projectedRevenue = closedReqs.reduce(
    (s, r) => s + r.requested_amount * ((r.success_fee_pct ?? 3) / 100),
    0
  );
  const avgClose =
    closedReqs.length > 0
      ? closedReqs.reduce((s, r) => s + differenceInDays(new Date(r.updated_at), new Date(r.created_at)), 0) /
        closedReqs.length
      : 0;

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const id = result.draggableId;
    if (newStatus === result.source.droppableId) return;
    updateStatus.mutate({ id, status: newStatus });
  };

  const exportCSV = () => {
    const headers = ['Empresa', 'Valor', 'Tipo', 'Status', 'Score', 'Criado em'];
    const rows = filtered.map((r) => [
      r.company_name,
      r.requested_amount,
      r.capital_type,
      STATUS_LABELS[r.status] || r.status,
      r.lead_score ?? '',
      format(new Date(r.created_at), 'dd/MM/yyyy'),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `captacoes_${format(now, 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Captações de Capital</h1>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Users className="h-3.5 w-3.5" /> Total Leads
              </div>
              <p className="text-2xl font-bold">{totalLeads}</p>
            </CardContent>
          </Card>
          <Card className={slaExpired > 0 ? 'border-destructive' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive text-xs mb-1">
                <AlertTriangle className="h-3.5 w-3.5" /> SLA Estourado
              </div>
              <p className="text-2xl font-bold">{slaExpired}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <DollarSign className="h-3.5 w-3.5" /> Ticket Médio
              </div>
              <p className="text-2xl font-bold">{formatCurrency(avgTicket)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="h-3.5 w-3.5" /> Receita Projetada
              </div>
              <p className="text-2xl font-bold">{formatCurrency(projectedRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Clock className="h-3.5 w-3.5" /> Fechamento Médio
              </div>
              <p className="text-2xl font-bold">{avgClose.toFixed(0)}d</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="webhooks">
              <Settings className="h-4 w-4 mr-1" /> Integrações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empresa..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="divida">Dívida</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch checked={filterSlaExpired} onCheckedChange={setFilterSlaExpired} id="sla" />
                <Label htmlFor="sla" className="text-sm">SLA Estourado</Label>
              </div>
              <div className="w-[180px]">
                <Label className="text-xs text-muted-foreground">Score: {scoreRange[0]}-{scoreRange[1]}</Label>
                <Slider min={0} max={100} step={5} value={scoreRange} onValueChange={setScoreRange} />
              </div>
            </div>

            {/* Kanban */}
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-5 gap-3 overflow-x-auto">
                {STATUSES.map((status) => (
                  <Droppable droppableId={status} key={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`rounded-lg border p-3 min-h-[400px] transition-colors ${
                          snapshot.isDraggingOver ? 'bg-accent/50' : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-sm">{STATUS_LABELS[status]}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {byStatus[status]?.length || 0}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {byStatus[status]?.map((req, index) => {
                            const slaOver =
                              req.sla_deadline && new Date(req.sla_deadline) < now && req.status !== 'closed';
                            return (
                              <Draggable draggableId={req.id} index={index} key={req.id}>
                                {(prov) => (
                                  <div
                                    ref={prov.innerRef}
                                    {...prov.draggableProps}
                                    {...prov.dragHandleProps}
                                    onClick={() => setSelectedLead(req)}
                                    className={`rounded-md border bg-card p-3 cursor-pointer hover:shadow-md transition-shadow ${
                                      slaOver ? 'border-destructive' : ''
                                    }`}
                                  >
                                    <p className="font-medium text-sm truncate">{req.company_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatCurrency(req.requested_amount)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                      {req.lead_score != null && (
                                        <Badge
                                          variant="outline"
                                          className={
                                            req.lead_score >= 70
                                              ? 'border-emerald-500 text-emerald-600'
                                              : req.lead_score >= 40
                                              ? 'border-yellow-500 text-yellow-600'
                                              : 'border-destructive text-destructive'
                                          }
                                        >
                                          {req.lead_score}
                                        </Badge>
                                      )}
                                      <Badge variant="outline" className="text-[10px]">
                                        {req.capital_type === 'equity' ? 'Equity' : 'Dívida'}
                                      </Badge>
                                    </div>
                                    {slaOver && (
                                      <div className="flex items-center gap-1 mt-1 text-destructive text-[10px]">
                                        <AlertTriangle className="h-3 w-3" /> SLA estourado
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                        </div>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          </TabsContent>

          <TabsContent value="webhooks">
            <WebhookManager integrations={integrations} onSave={(d) => saveIntegration.mutate(d)} />
          </TabsContent>
        </Tabs>

        {/* Lead Detail Modal */}
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedLead && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedLead.company_name}</DialogTitle>
                </DialogHeader>
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Valor:</span>{' '}
                        <strong>{formatCurrency(selectedLead.requested_amount)}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tipo:</span>{' '}
                        <strong>{selectedLead.capital_type === 'equity' ? 'Equity' : 'Dívida'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Contato:</span>{' '}
                        <strong>{selectedLead.full_name || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>{' '}
                        <strong>{selectedLead.email || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Telefone:</span>{' '}
                        <strong>{selectedLead.phone || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Setor:</span>{' '}
                        <strong>{selectedLead.sector || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Objetivo:</span>{' '}
                        <strong>{selectedLead.objective}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Faturamento:</span>{' '}
                        <strong>{selectedLead.monthly_revenue || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Matches:</span>{' '}
                        <strong>{selectedLead.matched_providers_count ?? 0}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Views:</span>{' '}
                        <strong>{selectedLead.views_count}</strong>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" onClick={() => assignToMe.mutate(selectedLead.id)}>
                        <UserPlus className="h-4 w-4 mr-1" /> Atribuir a mim
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowProposal(true)}>
                        <Send className="h-4 w-4 mr-1" /> Enviar Proposta
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => escalate.mutate(selectedLead.id)}
                      >
                        <ArrowUpCircle className="h-4 w-4 mr-1" /> Escalar
                      </Button>
                    </div>

                    {showProposal && (
                      <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
                        <Label>Texto da proposta</Label>
                        <Textarea
                          value={proposalText}
                          onChange={(e) => setProposalText(e.target.value)}
                          placeholder={`Prezado(a) ${selectedLead.full_name || 'Cliente'},\n\nApós análise do seu perfil, identificamos as seguintes opções de captação...\n\nAtenciosamente,\nEquipe Vispe`}
                          rows={6}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              sendProposal.mutate({ id: selectedLead.id, text: proposalText })
                            }
                            disabled={!proposalText.trim()}
                          >
                            Enviar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowProposal(false)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div>
                      <h3 className="font-semibold mb-2">Timeline</h3>
                      <CapitalTimeline requestId={selectedLead.id} />
                    </div>

                    {/* Chat */}
                    <div>
                      <h3 className="font-semibold mb-2">Chat</h3>
                      <CapitalChat requestId={selectedLead.id} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <CapitalScoreCard score={selectedLead.lead_score ?? 0} />
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge className={STATUS_COLORS[selectedLead.status]}>
                          {STATUS_LABELS[selectedLead.status] || selectedLead.status}
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">SLA</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedLead.sla_deadline ? (
                          <p
                            className={`text-sm font-medium ${
                              new Date(selectedLead.sla_deadline) < now ? 'text-destructive' : 'text-foreground'
                            }`}
                          >
                            {format(new Date(selectedLead.sla_deadline), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">N/A</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function WebhookManager({
  integrations,
  onSave,
}: {
  integrations: any[];
  onSave: (d: { key: string; value: string; active: boolean }) => void;
}) {
  const [webhookUrl, setWebhookUrl] = useState(
    integrations.find((i) => i.key === 'webhook_low_score')?.value || ''
  );
  const [webhookActive, setWebhookActive] = useState(
    integrations.find((i) => i.key === 'webhook_low_score')?.active ?? false
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Webhook — Leads Score Baixo (&lt;40)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure uma URL de webhook (n8n, Make, Zapier) para receber automaticamente leads com score abaixo de 40 para sequências de nutrição por email.
        </p>
        <div className="space-y-2">
          <Label>URL do Webhook</Label>
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://n8n.example.com/webhook/abc123"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={webhookActive} onCheckedChange={setWebhookActive} id="wh-active" />
          <Label htmlFor="wh-active">Ativo</Label>
        </div>
        <Button
          onClick={() => onSave({ key: 'webhook_low_score', value: webhookUrl, active: webhookActive })}
          disabled={!webhookUrl.trim()}
        >
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
