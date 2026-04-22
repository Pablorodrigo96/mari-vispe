import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Download, Users, ShoppingCart, TrendingUp, Banknote, Briefcase, Shield, Loader2, ToggleRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PAGE_SIZE = 50;

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function formatCurrency(v: number | null) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function exportCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function PaginationControls({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-2 mt-4 justify-center">
      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>Anterior</Button>
      <span className="text-sm text-muted-foreground">{page + 1} / {pages}</span>
      <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Próximo</Button>
    </div>
  );
}

function filterBySearch<T extends Record<string, any>>(items: T[], search: string, fields: string[]): T[] {
  if (!search.trim()) return items;
  const q = search.toLowerCase();
  return items.filter(item => fields.some(f => String(item[f] ?? '').toLowerCase().includes(q)));
}

function paginate<T>(items: T[], page: number): T[] {
  return items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
}

// ── Tab: Usuários ──
function UsersTab() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['crm-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*');
      return data || [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['crm-roles'],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('*');
      return data || [];
    },
  });

  const enriched = profiles.map(p => {
    const userRoles = roles.filter(r => r.user_id === p.user_id).map(r => r.role);
    return { ...p, roles: userRoles };
  });

  let filtered = filterBySearch(enriched, search, ['full_name', 'phone', 'company_name', 'cpf_cnpj']);
  if (roleFilter !== 'all') {
    filtered = filtered.filter(u => u.roles.includes(roleFilter));
  }

  const togglePartner = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_partner_accountant: !current }).eq('user_id', userId);
    queryClient.invalidateQueries({ queryKey: ['crm-profiles'] });
    toast({ title: !current ? 'Contador parceiro ativado' : 'Contador parceiro desativado' });
  };

  const paged = paginate(filtered, page);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nome, telefone, empresa..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filtrar role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as roles</SelectItem>
            <SelectItem value="seller">Seller</SelectItem>
            <SelectItem value="buyer">Buyer</SelectItem>
            <SelectItem value="advisor">Advisor</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="franchisee">Franchisee</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => exportCSV(filtered.map(({ roles: r, ...rest }) => ({ ...rest, roles: r.join(', ') })), 'usuarios.csv')}>
          <Download className="h-4 w-4 mr-1" /> Exportar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length} usuários encontrados</p>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                <TableCell>{u.phone || '—'}</TableCell>
                <TableCell>{u.company_name || '—'}</TableCell>
                <TableCell className="flex gap-1 flex-wrap">
                  {u.roles.map((r: string) => <Badge key={r} variant={r === 'admin' ? 'destructive' : 'secondary'} className="text-xs">{r}</Badge>)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => togglePartner(u.user_id, u.is_partner_accountant)}>
                    <ToggleRight className={`h-4 w-4 ${u.is_partner_accountant ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </Button>
                </TableCell>
                <TableCell>{formatDate(u.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <PaginationControls page={page} total={filtered.length} onPage={setPage} />
    </div>
  );
}

// ── Tab: Compradores ──
function BuyersTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data: buyers = [], isLoading } = useQuery({
    queryKey: ['crm-buyers'],
    queryFn: async () => {
      const { data } = await supabase.from('buyer_profiles').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const filtered = filterBySearch(buyers, search, ['buyer_name', 'email', 'whatsapp', 'company_name']);
  const paged = paginate(filtered, page);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nome, email, WhatsApp..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(filtered, 'compradores.csv')}>
          <Download className="h-4 w-4 mr-1" /> Exportar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length} compradores</p>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Categorias</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>UF</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map(b => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.buyer_name}</TableCell>
                <TableCell>{b.company_name || '—'}</TableCell>
                <TableCell className="max-w-[200px] truncate">{b.categories?.join(', ') || '—'}</TableCell>
                <TableCell>{formatCurrency(b.min_budget)} – {formatCurrency(b.max_budget)}</TableCell>
                <TableCell>{b.state || '—'}</TableCell>
                <TableCell>{b.whatsapp || '—'}</TableCell>
                <TableCell><Badge variant={b.status === 'active' ? 'default' : 'secondary'}>{b.status}</Badge></TableCell>
                <TableCell>{formatDate(b.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <PaginationControls page={page} total={filtered.length} onPage={setPage} />
    </div>
  );
}

// ── Tab: Investidores ──
function InvestorsTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data: interests = [], isLoading } = useQuery({
    queryKey: ['crm-interests'],
    queryFn: async () => {
      const { data } = await supabase.from('interest_logs').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const filtered = filterBySearch(interests, search, ['investor_name', 'investor_email', 'investor_whatsapp', 'investor_company', 'ticker']);
  const paged = paginate(filtered, page);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nome, email, ticker..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(filtered, 'investidores.csv')}>
          <Download className="h-4 w-4 mr-1" /> Exportar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length} interesses registrados</p>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.investor_name || '—'}</TableCell>
                <TableCell>{i.investor_email || '—'}</TableCell>
                <TableCell>{i.investor_whatsapp || '—'}</TableCell>
                <TableCell>{i.investor_company || '—'}</TableCell>
                <TableCell><Badge variant="outline">{i.ticker || '—'}</Badge></TableCell>
                <TableCell>{formatDate(i.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <PaginationControls page={page} total={filtered.length} onPage={setPage} />
    </div>
  );
}

// ── Tab: Leads de Capital ──
function CapitalLeadsTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['crm-capital'],
    queryFn: async () => {
      const { data } = await supabase.from('capital_requests').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const filtered = filterBySearch(requests, search, ['company_name', 'email', 'full_name', 'phone']);
  const paged = paginate(filtered, page);

  const scoreColor = (s: number | null) => {
    if (!s) return 'secondary';
    if (s >= 70) return 'default';
    if (s >= 40) return 'outline';
    return 'destructive';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar empresa, email..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(filtered, 'leads-capital.csv')}>
          <Download className="h-4 w-4 mr-1" /> Exportar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length} leads</p>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.company_name}</TableCell>
                <TableCell>{r.full_name || r.email || '—'}</TableCell>
                <TableCell><Badge variant="outline">{r.capital_type}</Badge></TableCell>
                <TableCell>{formatCurrency(r.requested_amount)}</TableCell>
                <TableCell><Badge variant={scoreColor(r.lead_score)}>{r.lead_score ?? '—'}</Badge></TableCell>
                <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                <TableCell>{formatDate(r.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <PaginationControls page={page} total={filtered.length} onPage={setPage} />
    </div>
  );
}

// ── Tab: Parceiros ──
function PartnersTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['crm-partners'],
    queryFn: async () => {
      const { data: allProfiles } = await supabase.from('profiles').select('*');
      const { data: allRoles } = await supabase.from('user_roles').select('*').eq('role', 'advisor');
      const { data: reservations } = await supabase.from('partner_lead_reservations').select('*');

      const advisorIds = new Set((allRoles || []).map(r => r.user_id));
      const partners = (allProfiles || []).filter(p => p.is_partner_accountant || advisorIds.has(p.user_id));

      return partners.map(p => {
        const res = (reservations || []).filter(r => r.partner_user_id === p.user_id);
        return {
          ...p,
          isAdvisor: advisorIds.has(p.user_id),
          totalReservations: res.length,
          activeReservations: res.filter(r => r.status === 'reserved' || r.status === 'exclusive').length,
        };
      });
    },
  });

  const filtered = filterBySearch(profiles, search, ['full_name', 'phone', 'company_name']);
  const paged = paginate(filtered, page);

  const togglePartner = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_partner_accountant: !current }).eq('user_id', userId);
    queryClient.invalidateQueries({ queryKey: ['crm-partners'] });
    toast({ title: !current ? 'Contador parceiro ativado' : 'Desativado' });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nome, telefone..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(filtered.map(({ isAdvisor, ...r }) => r), 'parceiros.csv')}>
          <Download className="h-4 w-4 mr-1" /> Exportar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length} parceiros/assessores</p>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Reservas</TableHead>
              <TableHead>Ativas</TableHead>
              <TableHead>Parceiro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.full_name || '—'}</TableCell>
                <TableCell>{p.phone || '—'}</TableCell>
                <TableCell>{p.company_name || '—'}</TableCell>
                <TableCell className="flex gap-1">
                  {p.isAdvisor && <Badge variant="outline">Advisor</Badge>}
                  {p.is_partner_accountant && <Badge>Contador</Badge>}
                </TableCell>
                <TableCell>{p.totalReservations}</TableCell>
                <TableCell>{p.activeReservations}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => togglePartner(p.user_id, p.is_partner_accountant)}>
                    <ToggleRight className={`h-4 w-4 ${p.is_partner_accountant ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <PaginationControls page={page} total={filtered.length} onPage={setPage} />
    </div>
  );
}

// ── Tab: Franqueados ──
function FranchiseesTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data: franchisees = [], isLoading } = useQuery({
    queryKey: ['crm-franchisees'],
    queryFn: async () => {
      const { data: fRoles } = await supabase.from('user_roles').select('*').eq('role', 'franchisee');
      const { data: requests } = await supabase.from('franchisee_requests').select('*');
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: regions } = await supabase.from('franchisee_regions').select('*');

      const userIds = new Set([
        ...(fRoles || []).map(r => r.user_id),
        ...(requests || []).map(r => r.user_id),
      ]);

      return Array.from(userIds).map(uid => {
        const profile = (profiles || []).find(p => p.user_id === uid);
        const req = (requests || []).find(r => r.user_id === uid);
        const reg = (regions || []).find(r => r.user_id === uid);
        const hasRole = (fRoles || []).some(r => r.user_id === uid);
        return {
          user_id: uid,
          full_name: profile?.full_name || '—',
          phone: profile?.phone || '—',
          company_name: profile?.company_name || '—',
          hasRole,
          requestStatus: req?.status || (hasRole ? 'approved' : '—'),
          states: reg?.states?.join(', ') || '—',
          categories: reg?.categories?.join(', ') || '—',
          created_at: req?.created_at || profile?.created_at,
        };
      });
    },
  });

  const filtered = filterBySearch(franchisees, search, ['full_name', 'phone', 'company_name']);
  const paged = paginate(filtered, page);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nome, telefone..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(filtered, 'franqueados.csv')}>
          <Download className="h-4 w-4 mr-1" /> Exportar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length} franqueados</p>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Estados</TableHead>
              <TableHead>Categorias</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map(f => (
              <TableRow key={f.user_id}>
                <TableCell className="font-medium">{f.full_name}</TableCell>
                <TableCell>{f.phone}</TableCell>
                <TableCell>{f.company_name}</TableCell>
                <TableCell>
                  <Badge variant={f.requestStatus === 'approved' ? 'default' : f.requestStatus === 'pending' ? 'outline' : 'secondary'}>
                    {f.requestStatus}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[150px] truncate">{f.states}</TableCell>
                <TableCell className="max-w-[150px] truncate">{f.categories}</TableCell>
                <TableCell>{formatDate(f.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <PaginationControls page={page} total={filtered.length} onPage={setPage} />
    </div>
  );
}

// ── Main Page ──
export default function AdminCRM() {
  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">CRM Centralizado</h1>
            <p className="text-muted-foreground mt-1">Gerencie todos os cadastros da plataforma em um só lugar</p>
          </div>

          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid grid-cols-6 w-full max-w-3xl">
              <TabsTrigger value="users" className="flex gap-1 items-center text-xs"><Users className="h-3.5 w-3.5" />Usuários</TabsTrigger>
              <TabsTrigger value="buyers" className="flex gap-1 items-center text-xs"><ShoppingCart className="h-3.5 w-3.5" />Compradores</TabsTrigger>
              <TabsTrigger value="investors" className="flex gap-1 items-center text-xs"><TrendingUp className="h-3.5 w-3.5" />Investidores</TabsTrigger>
              <TabsTrigger value="capital" className="flex gap-1 items-center text-xs"><Banknote className="h-3.5 w-3.5" />Capital</TabsTrigger>
              <TabsTrigger value="partners" className="flex gap-1 items-center text-xs"><Briefcase className="h-3.5 w-3.5" />Parceiros</TabsTrigger>
              <TabsTrigger value="franchisees" className="flex gap-1 items-center text-xs"><Shield className="h-3.5 w-3.5" />Franqueados</TabsTrigger>
            </TabsList>

            <TabsContent value="users"><Card><CardHeader><CardTitle>Todos os Usuários</CardTitle></CardHeader><CardContent><UsersTab /></CardContent></Card></TabsContent>
            <TabsContent value="buyers"><Card><CardHeader><CardTitle>Compradores Cadastrados</CardTitle></CardHeader><CardContent><BuyersTab /></CardContent></Card></TabsContent>
            <TabsContent value="investors"><Card><CardHeader><CardTitle>Interesses Registrados</CardTitle></CardHeader><CardContent><InvestorsTab /></CardContent></Card></TabsContent>
            <TabsContent value="capital"><Card><CardHeader><CardTitle>Leads de Captação</CardTitle></CardHeader><CardContent><CapitalLeadsTab /></CardContent></Card></TabsContent>
            <TabsContent value="partners"><Card><CardHeader><CardTitle>Parceiros & Contadores</CardTitle></CardHeader><CardContent><PartnersTab /></CardContent></Card></TabsContent>
            <TabsContent value="franchisees"><Card><CardHeader><CardTitle>Franqueados</CardTitle></CardHeader><CardContent><FranchiseesTab /></CardContent></Card></TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}
