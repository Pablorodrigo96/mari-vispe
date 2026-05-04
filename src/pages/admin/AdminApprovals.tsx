import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, UserCog, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Req {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  full_name?: string | null;
  phone?: string | null;
  kind: 'advisor' | 'franchisee';
}

export default function AdminApprovals() {
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: adv }, { data: fr }] = await Promise.all([
      supabase.from('advisor_requests' as any).select('id,user_id,status,created_at').eq('status', 'pending').order('created_at'),
      supabase.from('franchisee_requests' as any).select('id,user_id,status,created_at').eq('status', 'pending').order('created_at'),
    ]);
    const userIds = Array.from(new Set([
      ...((adv as any[]) ?? []).map((r) => r.user_id),
      ...((fr as any[]) ?? []).map((r) => r.user_id),
    ]));
    let profilesMap = new Map<string, { full_name: string | null; phone: string | null }>();
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('user_id,full_name,phone').in('user_id', userIds);
      profilesMap = new Map((profs ?? []).map((p) => [p.user_id, { full_name: p.full_name, phone: p.phone }]));
    }
    const merged: Req[] = [
      ...((adv as any[]) ?? []).map((r) => ({ ...r, kind: 'advisor' as const, ...(profilesMap.get(r.user_id) ?? {}) })),
      ...((fr as any[]) ?? []).map((r) => ({ ...r, kind: 'franchisee' as const, ...(profilesMap.get(r.user_id) ?? {}) })),
    ];
    setItems(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (req: Req) => {
    const fn = req.kind === 'advisor' ? 'approve_advisor_request' : 'approve_franchisee_request';
    const { error } = await supabase.rpc(fn as any, { p_request_id: req.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Aprovado');
    load();
  };

  const handleReject = async (req: Req) => {
    const reason = prompt('Motivo da rejeição (opcional):') ?? '';
    const fn = req.kind === 'advisor' ? 'reject_advisor_request' : 'reject_franchisee_request';
    const { error } = await supabase.rpc(fn as any, { p_request_id: req.id, p_reason: reason || null });
    if (error) { toast.error(error.message); return; }
    toast.success('Rejeitado');
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Aprovações pendentes</h1>
          <p className="text-sm text-muted-foreground">Pedidos de acesso de Assessor e Franqueado.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>Pedidos ({items.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum pedido pendente.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Pedido em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((req) => (
                    <TableRow key={`${req.kind}-${req.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {req.kind === 'advisor' ? <UserCog className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                          {req.kind === 'advisor' ? 'Assessor' : 'Franqueado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="break-words">{req.full_name ?? '—'}</TableCell>
                      <TableCell>{req.phone ?? '—'}</TableCell>
                      <TableCell>{new Date(req.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" onClick={() => handleApprove(req)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />Aprovar
                        </Button>
                        <Button size="sm" variant="outline" className="bg-transparent" onClick={() => handleReject(req)}>
                          <XCircle className="h-4 w-4 mr-1" />Rejeitar
                        </Button>
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
