import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashShell, DashCard } from "@/components/dashboards/DashShell";
import { DashKpi } from "@/components/dashboards/DashKpi";
import { DashDonut, DashBar } from "@/components/dashboards/DashCharts";

const REFRESH_MS = 60_000;

export default function DashboardMatchPage() {
  const kpis = useQuery({
    queryKey: ["dash-match"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from("mv_dashboard_match" as any).select("*").maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const rowsQ = useQuery({
    queryKey: ["dash-match-rows"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_v_mandates_full" as any)
        .select("outcome, deal_type, regiao, uf, deal_phase")
        .eq("deal_phase", "match")
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const k = kpis.data ?? {};
  const rows = rowsQ.data ?? [];

  const byStatus = aggCount(rows, (r) => r.outcome ?? "—");
  const byType = aggCount(rows, (r) => r.deal_type ?? "—");
  const byRegion = aggCount(rows, (r) => r.regiao ?? "—");
  const byState = aggCount(rows, (r) => r.uf ?? "—").sort((a, b) => b.value - a.value).slice(0, 15);

  return (
    <DashShell
      title="Match"
      subtitle="Operações em fase de matching entre vendedores e compradores"
      onRefresh={() => { kpis.refetch(); rowsQ.refetch(); }}
      liveAge={kpis.dataUpdatedAt ? Math.floor((Date.now() - kpis.dataUpdatedAt) / 1000) : undefined}
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <DashKpi label="Total" value={k.total ?? 0} loading={kpis.isLoading} />
        <DashKpi label="Em Andamento" value={k.em_andamento ?? 0} accent="amber" loading={kpis.isLoading} />
        <DashKpi label="Concluídos" value={k.concluidos ?? 0} accent="success" loading={kpis.isLoading} />
        <DashKpi label="Cancelados" value={k.cancelados ?? 0} accent="danger" loading={kpis.isLoading} />
        <DashKpi label="Tempo médio" value={`${Number(k.tempo_medio_dias ?? 0).toFixed(0)}d`} format="raw" accent="cyan" loading={kpis.isLoading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashCard title="Matchs por status"><DashDonut data={byStatus} centerValue={rows.length} centerLabel="Matches" /></DashCard>
        <DashCard title="Tipos de operação"><DashDonut data={byType} centerValue={rows.length} centerLabel="Total" /></DashCard>
        <DashCard title="Matchs por região"><DashDonut data={byRegion} centerValue={rows.length} centerLabel="Total" /></DashCard>
      </div>

      <DashCard title="Matchs por estado" span="wide">
        <DashBar data={byState} layout="horizontal" height={Math.max(280, byState.length * 22)} />
      </DashCard>
    </DashShell>
  );
}

function aggCount(rows: any[], key: (r: any) => string) {
  const map = new Map<string, number>();
  for (const r of rows) { const k = key(r); map.set(k, (map.get(k) ?? 0) + 1); }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}
