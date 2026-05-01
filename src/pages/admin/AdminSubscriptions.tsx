import { useEffect, useState } from 'react';
import { CreditCard, Search, Crown, Calendar } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionWithProfile {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  multiples_limit: number;
  multiples_used: number;
  dcf_limit: number;
  dcf_used: number;
  expires_at: string | null;
  created_at: string;
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

const planConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  free: { label: 'Gratuito', variant: 'outline' },
  basic: { label: 'Básico', variant: 'secondary' },
  master: { label: 'Master', variant: 'default' },
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Ativo', variant: 'default' },
  canceled: { label: 'Cancelado', variant: 'destructive' },
  expired: { label: 'Expirado', variant: 'outline' },
  past_due: { label: 'Atrasado', variant: 'destructive' },
};

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  async function fetchSubscriptions() {
    try {
      // Fetch subscriptions
      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;

      // Fetch profiles for all users
      const userIds = (subs || []).map(s => s.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine data
      const profilesMap = (profiles || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, { full_name: string | null; phone: string | null }>);

      const combined: SubscriptionWithProfile[] = (subs || []).map(sub => ({
        ...sub,
        profile: profilesMap[sub.user_id] || null,
      }));

      setSubscriptions(combined);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Erro ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      (sub.profile?.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      sub.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlan = filterPlan === 'all' || sub.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const masterCount = subscriptions.filter(s => s.plan === 'master' && s.status === 'active').length;
  const totalActive = subscriptions.filter(s => s.status === 'active').length;

  return (
    <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assinaturas</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie as assinaturas dos usuários
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Assinaturas</p>
                    <p className="text-2xl font-bold text-foreground">{subscriptions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Crown className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assinantes Master</p>
                    <p className="text-2xl font-bold text-foreground">{masterCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
                    <p className="text-2xl font-bold text-foreground">{totalActive}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filtrar por plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os planos</SelectItem>
                    <SelectItem value="free">Gratuito</SelectItem>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="canceled">Cancelado</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Subscriptions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Lista de Assinaturas ({filteredSubscriptions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Créditos Múltiplos</TableHead>
                      <TableHead>Créditos DCF</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {sub.profile?.full_name || 'Sem nome'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {sub.profile?.phone || 'Sem telefone'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={planConfig[sub.plan]?.variant || 'outline'}>
                            {sub.plan === 'master' && <Crown className="h-3 w-3 mr-1" />}
                            {planConfig[sub.plan]?.label || sub.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[sub.status]?.variant || 'secondary'}>
                            {statusConfig[sub.status]?.label || sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-foreground">{sub.multiples_used}</span>
                          <span className="text-muted-foreground">/{sub.multiples_limit === -1 ? '∞' : sub.multiples_limit}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-foreground">{sub.dcf_used}</span>
                          <span className="text-muted-foreground">/{sub.dcf_limit === -1 ? '∞' : sub.dcf_limit}</span>
                        </TableCell>
                        <TableCell>
                          {sub.expires_at 
                            ? new Date(sub.expires_at).toLocaleDateString('pt-BR')
                            : <span className="text-muted-foreground">-</span>
                          }
                        </TableCell>
                        <TableCell>
                          {new Date(sub.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
    </AdminLayout>
  );
}
