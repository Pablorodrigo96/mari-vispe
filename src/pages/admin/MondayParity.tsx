import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const MONDAY_REFERENCE = {
  sellside: {
    total: 220, concluidos: 29, cancelados: 125, em_andamento: 26,
    valor_total: 129436656.58, vispe_total: 4512084.77,
    por_executivo: {
      'Rafael Cocolichio': 71, 'Lucas Borges Serafim': 34, 'Marieli Cunha Brollo': 27,
      'Brenda Mathias da Silva': 11, 'Brenda Pereira Freitas': 3, 'Vitor dos Santos Rosa': 2,
      'Maria Eduarda Subtil Silva': 2, 'Evelin Luiza Siebenborn': 2,
      'Othelo Teixeira Ilha': 2, 'Pablo Rodrigo Constantino Crecencio': 1,
    } as Record<string, number>,
  },
  buyside: { total: 24, valor_total: 10400000, vispe_total: 2834570 },
};

function fmtMoney(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}
function deltaPct(monday: number, mari: number): number {
  if (monday === 0) return mari === 0 ? 0 : 100;
  return ((mari - monday) / monday) * 100;
}
function deltaCls(d: number): string {
  const a = Math.abs(d);
  if (a === 0) return 'text-emerald-500';
  if (a <= 5) return 'text-amber-500';
  if (a <= 15) return 'text-orange-500';
  return 'text-red-500';
}
function deltaIcon(d: number): string {
  const a = Math.abs(d);
  if (a === 0) return '✓';
  if (a <= 5) return '⚠';
  if (a <= 15) return '🟧';
  return '❌';
}

interface Stats {
  sell_total: number; sell_concluidos: number; sell_cancelados: number; sell_andamento: number;
  sell_valor: number; sell_vispe: number;
  sell_por_exec: Record<string, number>;
  buy_total: number; buy_valor: number; buy_vispe: number;
}

export default function MondayParity() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Sellside
      const { data: sell } = await (supabase as any).schema('equity_brain').from('mandates')
        .select('outcome,valor_operacao,faturamento_vispe,responsavel_id')
        .eq('imported_from', 'monday_sellside');
      // Buyside
      const { data: buy } = await (supabase as any).schema('equity_brain').from('mandates')
        .select('valor_operacao,faturamento_vispe')
        .eq('imported_from', 'monday_buyside');
      // Profiles para mapear ID → nome
      const ids = Array.from(new Set((sell ?? []).map((m: any) => m.responsavel_id).filter(Boolean)));
      const { data: profs } = await supabase.from('profiles').select('user_id,full_name').in('user_id', ids as any);
      const idToName = new Map<string, string>();
      (profs ?? []).forEach((p: any) => idToName.set(p.user_id, p.full_name ?? '—'));

      const exec: Record<string, number> = {};
      let sval = 0, svis = 0, conc = 0, canc = 0, and = 0;
      (sell ?? []).forEach((m: any) => {
        sval += Number(m.valor_operacao ?? 0);
        svis += Number(m.faturamento_vispe ?? 0);
        if (m.outcome === 'concluido' || m.outcome === 'vendemos') conc++;
        else if (m.outcome === 'cancelado') canc++;
        else and++;
        if (m.responsavel_id) {
          const n = idToName.get(m.responsavel_id) ?? '(sem perfil)';
          exec[n] = (exec[n] ?? 0) + 1;
        }
      });
      let bval = 0, bvis = 0;
      (buy ?? []).forEach((m: any) => {
        bval += Number(m.valor_operacao ?? 0);
        bvis += Number(m.faturamento_vispe ?? 0);
      });

      setStats({
        sell_total: sell?.length ?? 0,
        sell_concluidos: conc, sell_cancelados: canc, sell_andamento: and,
        sell_valor: sval, sell_vispe: svis, sell_por_exec: exec,
        buy_total: buy?.length ?? 0, buy_valor: bval, buy_vispe: bvis,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <AdminLayout><div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</div></AdminLayout>;
  }
  if (!stats) return <AdminLayout><p>Sem dados.</p></AdminLayout>;

  const rows: Array<{ kpi: string; monday: string; mari: string; deltaNum: number }> = [
    { kpi: 'Sellside · Total mandatos', monday: String(MONDAY_REFERENCE.sellside.total), mari: String(stats.sell_total), deltaNum: deltaPct(MONDAY_REFERENCE.sellside.total, stats.sell_total) },
    { kpi: 'Sellside · Concluídos', monday: String(MONDAY_REFERENCE.sellside.concluidos), mari: String(stats.sell_concluidos), deltaNum: deltaPct(MONDAY_REFERENCE.sellside.concluidos, stats.sell_concluidos) },
    { kpi: 'Sellside · Cancelados', monday: String(MONDAY_REFERENCE.sellside.cancelados), mari: String(stats.sell_cancelados), deltaNum: deltaPct(MONDAY_REFERENCE.sellside.cancelados, stats.sell_cancelados) },
    { kpi: 'Sellside · Em andamento', monday: String(MONDAY_REFERENCE.sellside.em_andamento), mari: String(stats.sell_andamento), deltaNum: deltaPct(MONDAY_REFERENCE.sellside.em_andamento, stats.sell_andamento) },
    { kpi: 'Sellside · Σ Valor operação', monday: fmtMoney(MONDAY_REFERENCE.sellside.valor_total), mari: fmtMoney(stats.sell_valor), deltaNum: deltaPct(MONDAY_REFERENCE.sellside.valor_total, stats.sell_valor) },
    { kpi: 'Sellside · Σ Faturamento Vispe', monday: fmtMoney(MONDAY_REFERENCE.sellside.vispe_total), mari: fmtMoney(stats.sell_vispe), deltaNum: deltaPct(MONDAY_REFERENCE.sellside.vispe_total, stats.sell_vispe) },
    { kpi: 'Buyside · Total', monday: String(MONDAY_REFERENCE.buyside.total), mari: String(stats.buy_total), deltaNum: deltaPct(MONDAY_REFERENCE.buyside.total, stats.buy_total) },
    { kpi: 'Buyside · Σ Valor operação', monday: fmtMoney(MONDAY_REFERENCE.buyside.valor_total), mari: fmtMoney(stats.buy_valor), deltaNum: deltaPct(MONDAY_REFERENCE.buyside.valor_total, stats.buy_valor) },
    { kpi: 'Buyside · Σ Faturamento Vispe', monday: fmtMoney(MONDAY_REFERENCE.buyside.vispe_total), mari: fmtMoney(stats.buy_vispe), deltaNum: deltaPct(MONDAY_REFERENCE.buyside.vispe_total, stats.buy_vispe) },
  ];

  const execRows = Object.entries(MONDAY_REFERENCE.sellside.por_executivo).map(([name, mondayCount]) => {
    const mariCount = stats.sell_por_exec[name] ?? 0;
    return { name, monday: mondayCount, mari: mariCount, deltaNum: deltaPct(mondayCount, mariCount) };
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Paridade Monday × MARI</h1>
          <p className="text-muted-foreground mt-1">Compara KPIs de referência do Monday com o estado atual da MARI.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>KPIs principais</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>KPI</TableHead><TableHead>Monday</TableHead><TableHead>MARI</TableHead><TableHead>Delta</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.kpi}>
                    <TableCell className="font-medium break-words max-w-[280px]">{r.kpi}</TableCell>
                    <TableCell className="text-muted-foreground">{r.monday}</TableCell>
                    <TableCell className="font-semibold">{r.mari}</TableCell>
                    <TableCell className={deltaCls(r.deltaNum)}>{deltaIcon(r.deltaNum)} {r.deltaNum.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mandatos por executivo (Sellside)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Executivo</TableHead><TableHead>Monday</TableHead><TableHead>MARI</TableHead><TableHead>Delta</TableHead></TableRow></TableHeader>
              <TableBody>
                {execRows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="break-words">{r.name}</TableCell>
                    <TableCell><Badge variant="outline">{r.monday}</Badge></TableCell>
                    <TableCell><Badge>{r.mari}</Badge></TableCell>
                    <TableCell className={deltaCls(r.deltaNum)}>{deltaIcon(r.deltaNum)} {r.deltaNum.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
