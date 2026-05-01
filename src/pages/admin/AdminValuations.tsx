import { useEffect, useState } from 'react';
import { ChartBar, Search, Calculator, TrendingUp } from 'lucide-react';
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
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface ValuationHistory {
  id: string;
  user_id: string | null;
  valuation_type: string;
  company_type: string | null;
  segment: string | null;
  inputs: unknown;
  result: unknown;
  status: string;
  created_at: string;
  profile?: {
    full_name: string | null;
  } | null;
}

const typeConfig: Record<string, { label: string; variant: 'default' | 'secondary' }> = {
  multiples: { label: 'Múltiplos', variant: 'secondary' },
  dcf: { label: 'DCF', variant: 'default' },
};

export default function AdminValuations() {
  const [valuations, setValuations] = useState<ValuationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchValuations();
  }, []);

  async function fetchValuations() {
    try {
      const { data: vals, error: valsError } = await supabase
        .from('valuation_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (valsError) throw valsError;

      // Fetch profiles for users
      const userIds = (vals || []).filter(v => v.user_id).map(v => v.user_id as string);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profilesMap = (profiles || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, { full_name: string | null }>);

      const combined = (vals || []).map(v => ({
        ...v,
        profile: v.user_id ? profilesMap[v.user_id] : null,
      }));

      setValuations(combined);
    } catch (error) {
      console.error('Error fetching valuations:', error);
      toast.error('Erro ao carregar valuations');
    } finally {
      setLoading(false);
    }
  }

  const filteredValuations = valuations.filter(val => {
    const matchesSearch = 
      (val.profile?.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (val.segment?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (val.company_type?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || val.valuation_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const multiplesCount = valuations.filter(v => v.valuation_type === 'multiples').length;
  const dcfCount = valuations.filter(v => v.valuation_type === 'dcf').length;

  return (
    <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Valuations</h1>
            <p className="text-muted-foreground mt-1">
              Histórico de valuations realizados na plataforma
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <ChartBar className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Valuations</p>
                    <p className="text-2xl font-bold text-foreground">{valuations.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Calculator className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Por Múltiplos</p>
                    <p className="text-2xl font-bold text-foreground">{multiplesCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">DCF Master</p>
                    <p className="text-2xl font-bold text-foreground">{dcfCount}</p>
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
                    placeholder="Buscar por nome, segmento ou tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="multiples">Múltiplos</SelectItem>
                    <SelectItem value="dcf">DCF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Valuations Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBar className="h-5 w-5" />
                Histórico de Valuations ({filteredValuations.length})
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
                      <TableHead>Tipo</TableHead>
                      <TableHead>Segmento</TableHead>
                      <TableHead>Tipo Empresa</TableHead>
                      <TableHead>Valor Estimado</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredValuations.map((val) => {
                      const resultData = val.result as Record<string, unknown> | null;
                      const estimatedValue = resultData?.valorMedio || resultData?.enterpriseValue || null;
                      
                      return (
                        <TableRow key={val.id}>
                          <TableCell>
                            <p className="font-medium text-foreground">
                              {val.profile?.full_name || 'Usuário anônimo'}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={typeConfig[val.valuation_type]?.variant || 'secondary'}>
                              {typeConfig[val.valuation_type]?.label || val.valuation_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">
                              {val.segment || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">
                              {val.company_type || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {estimatedValue && typeof estimatedValue === 'number'
                              ? <span className="font-medium text-foreground">{formatCurrency(estimatedValue)}</span>
                              : <span className="text-muted-foreground">-</span>
                            }
                          </TableCell>
                          <TableCell>
                            {new Date(val.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
    </AdminLayout>
  );
}
