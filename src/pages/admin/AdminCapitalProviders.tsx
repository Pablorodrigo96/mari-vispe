import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import { Plus, Pencil } from 'lucide-react';

type Provider = {
  id: string;
  name: string;
  type: string;
  ticket_min: number | null;
  ticket_max: number | null;
  sectors: string[] | null;
  instruments: string[] | null;
  regions: string[] | null;
  contact_email: string | null;
  active: boolean | null;
  webhook_url: string | null;
};

const TYPES = [
  { value: 'bank', label: 'Banco' },
  { value: 'fund', label: 'Fundo' },
  { value: 'family_office', label: 'Family Office' },
  { value: 'angel', label: 'Investidor Anjo' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'bndes', label: 'BNDES' },
];

const emptyForm = {
  name: '',
  type: 'bank',
  ticket_min: '',
  ticket_max: '',
  sectors: '',
  instruments: '',
  regions: '',
  contact_email: '',
  webhook_url: '',
  active: true,
};

export default function AdminCapitalProviders() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['admin-capital-providers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('capital_providers').select('*').order('name');
      if (error) throw error;
      return data as Provider[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        type: form.type,
        ticket_min: form.ticket_min ? Number(form.ticket_min) : null,
        ticket_max: form.ticket_max ? Number(form.ticket_max) : null,
        sectors: form.sectors ? form.sectors.split(',').map((s) => s.trim()) : [],
        instruments: form.instruments ? form.instruments.split(',').map((s) => s.trim()) : [],
        regions: form.regions ? form.regions.split(',').map((s) => s.trim()) : [],
        contact_email: form.contact_email || null,
        webhook_url: form.webhook_url || null,
        active: form.active,
      };

      if (editId) {
        const { error } = await supabase.from('capital_providers').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('capital_providers').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-capital-providers'] });
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      toast.success(editId ? 'Provider atualizado' : 'Provider criado');
    },
    onError: () => toast.error('Erro ao salvar provider'),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('capital_providers').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-capital-providers'] }),
  });

  const openEdit = (p: Provider) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      type: p.type,
      ticket_min: p.ticket_min?.toString() || '',
      ticket_max: p.ticket_max?.toString() || '',
      sectors: p.sectors?.join(', ') || '',
      instruments: p.instruments?.join(', ') || '',
      regions: p.regions?.join(', ') || '',
      contact_email: p.contact_email || '',
      webhook_url: p.webhook_url || '',
      active: p.active ?? true,
    });
    setShowForm(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Provedores de Capital</h1>
          <Button
            onClick={() => {
              setEditId(null);
              setForm(emptyForm);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Novo Provider
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Setores</TableHead>
                    <TableHead>Instrumentos</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TYPES.find((t) => t.value === p.type)?.label || p.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.ticket_min != null ? formatCurrency(p.ticket_min) : '-'} –{' '}
                        {p.ticket_max != null ? formatCurrency(p.ticket_max) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{p.sectors?.join(', ') || '-'}</TableCell>
                      <TableCell className="text-sm">{p.instruments?.join(', ') || '-'}</TableCell>
                      <TableCell>
                        <Switch
                          checked={p.active ?? false}
                          onCheckedChange={(v) => toggleActive.mutate({ id: p.id, active: v })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {providers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum provider cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Editar Provider' : 'Novo Provider'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ticket Mín (R$)</Label>
                  <Input
                    type="number"
                    value={form.ticket_min}
                    onChange={(e) => setForm({ ...form, ticket_min: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Ticket Máx (R$)</Label>
                  <Input
                    type="number"
                    value={form.ticket_max}
                    onChange={(e) => setForm({ ...form, ticket_max: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Setores (separar por vírgula)</Label>
                <Input
                  value={form.sectors}
                  onChange={(e) => setForm({ ...form, sectors: e.target.value })}
                  placeholder="tech, saude, varejo"
                />
              </div>
              <div>
                <Label>Instrumentos (separar por vírgula)</Label>
                <Input
                  value={form.instruments}
                  onChange={(e) => setForm({ ...form, instruments: e.target.value })}
                  placeholder="credito, equity, antecipacao"
                />
              </div>
              <div>
                <Label>Email de contato</Label>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                  id="form-active"
                />
                <Label htmlFor="form-active">Ativo</Label>
              </div>
              <Button onClick={() => upsert.mutate()} disabled={!form.name.trim()}>
                {editId ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
