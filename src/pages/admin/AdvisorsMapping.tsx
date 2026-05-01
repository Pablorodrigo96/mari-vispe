import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Pending {
  id: string;
  monday_name: string;
  occurrences: number;
  last_seen_at: string;
  resolved_user_id: string | null;
}
interface Profile { user_id: string; full_name: string | null; }

export default function AdvisorsMapping() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Pending[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: pend }, { data: profs }] = await Promise.all([
      (supabase as any).schema('equity_brain').from('advisors_pending_mapping')
        .select('id,monday_name,occurrences,last_seen_at,resolved_user_id')
        .is('resolved_user_id', null)
        .order('occurrences', { ascending: false }),
      supabase.from('profiles').select('user_id,full_name').not('full_name', 'is', null).order('full_name'),
    ]);
    setPending((pend ?? []) as Pending[]);
    setProfiles((profs ?? []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const apply = async (mondayName: string) => {
    const userId = selection[mondayName];
    if (!userId) {
      toast({ title: 'Selecione um usuário antes', variant: 'destructive' });
      return;
    }
    setSubmitting(mondayName);
    const { data, error } = await supabase.functions.invoke('eb-resolve-advisor-mapping', {
      body: { monday_name: mondayName, user_id: userId },
    });
    setSubmitting(null);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    const r = data as { updated_responsavel: number; updated_padrinho: number };
    toast({
      title: 'Mapeamento aplicado',
      description: `${r.updated_responsavel} mandato(s) atualizado(s) como responsável · ${r.updated_padrinho} como padrinho`,
    });
    await load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resolver advisors do Monday</h1>
          <p className="text-muted-foreground mt-1">Vincule cada nome importado do Monday a um usuário real da MARI.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pendentes ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</div>
            ) : pending.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 className="h-5 w-5" />
                <span>Nenhum advisor pendente — tudo mapeado.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome no Monday</TableHead>
                    <TableHead>Ocorrências</TableHead>
                    <TableHead>Vincular a</TableHead>
                    <TableHead className="w-32">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium break-words">{p.monday_name}</TableCell>
                      <TableCell><Badge variant="outline">{p.occurrences}</Badge></TableCell>
                      <TableCell>
                        <Select
                          value={selection[p.monday_name] ?? ''}
                          onValueChange={(v) => setSelection((s) => ({ ...s, [p.monday_name]: v }))}
                        >
                          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Selecione um usuário…" /></SelectTrigger>
                          <SelectContent>
                            {profiles.map((u) => (
                              <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => apply(p.monday_name)}
                          disabled={submitting === p.monday_name || !selection[p.monday_name]}
                        >
                          {submitting === p.monday_name
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : 'Aplicar'}
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
