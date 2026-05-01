import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashShell, DashCard } from "@/components/dashboards/DashShell";
import { DashKpi } from "@/components/dashboards/DashKpi";
import { DashDonut, DashBar } from "@/components/dashboards/DashCharts";

const REFRESH_MS = 60_000;

export default function DashboardNboPage() {
  const kpis = useQuery({
    queryKey: ["dash-nbo"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_nbo" as any);
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as any;
    },
  });

  const rowsQ = useQuery({
    queryKey: ["dash-nbo-rows"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_v_mandates_full" as any)
        .select("outcome, uf, valor_operacao, faturamento_vispe, responsavel_id")
        .eq("deal_phase", "nbo")
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const k = kpis.data ?? {};
  const rows = rowsQ.data ?? [];

  const byState = aggCount(rows, (r) => r.uf ?? "—").sort((a, b) => b.value - a.value).slice(0, 15);
  const byExec = aggCount(rows, (r) => r.responsavel_id ?? "Sem responsável").slice(0, 8);

  return (
    <DashShell
      title="NBO"
      subtitle="Non-Binding Offers em negociação · valores e success fees"
      onRefresh={() => { kpis.refetch(); rowsQ.refetch(); }}
      liveAge={kpis.dataUpdatedAt ? Math.floor((Date.now() - kpis.dataUpdatedAt) / 1000) : undefined}
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <DashKpi label="Total" value={k.total ?? 0} loading={kpis.isLoading} />
        <DashKpi label="Concluídos" value={k.concluidos ?? 0} accent="success" loading={kpis.isLoading} />
        <DashKpi label="Em Andamento" value={k.em_andamento ?? 0} accent="amber" loading={kpis.isLoading} />
        <DashKpi label="Cancelados" value={k.cancelados ?? 0} accent="danger" loading={kpis.isLoading} />
        <DashKpi label="Tempo médio" value={`${Number(k.tempo_medio_dias ?? 0).toFixed(0)}d`} format="raw" accent="cyan" loading={kpis.isLoading} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DashKpi label="Valor Total" value={Number(k.valor_total ?? 0)} format="currency" loading={kpis.isLoading} />
        <DashKpi label="Valor Médio" value={Number(k.valor_medio ?? 0)} format="currency" accent="cyan" loading={kpis.isLoading} />
        <DashKpi label="Comissões Total" value={Number(k.comissoes_total ?? 0)} format="currency" accent="volt" loading={kpis.isLoading} />
        <DashKpi label="Ticket Médio" value={Number(k.ticket_medio ?? 0)} format="currency" accent="success" loading={kpis.isLoading} />
      </div>

      <DashCard title="NBOs por estado" span="wide">
        <DashBar data={byState} layout="horizontal" height={Math.max(280, byState.length * 22)} />
      </DashCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashCard title="NBOs por executivo (quantidade)">
          <DashDonut data={byExec} centerValue={rows.length} centerLabel="NBOs" />
        </DashCard>
        <DashCard title="NBOs por executivo (volume)">
          <DashBar data={byExec} highlightTop />
        </DashCard>
      </div>
    </DashShell>
  );
}

function aggCount(rows: any[], key: (r: any) => string) {
  const map = new Map<string, number>();
  for (const r of rows) { const k = key(r); map.set(k, (map.get(k) ?? 0) + 1); }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}
