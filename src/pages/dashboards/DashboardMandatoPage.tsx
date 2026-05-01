import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashShell, DashCard } from "@/components/dashboards/DashShell";
import { DashKpi } from "@/components/dashboards/DashKpi";
import { DashDonut, DashStackedBar, DashBar, DashLine } from "@/components/dashboards/DashCharts";

const REFRESH_MS = 60_000;

export default function DashboardMandatoPage() {
  const kpis = useQuery({
    queryKey: ["dash-mandato"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_mandato" as any);
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as any;
    },
  });

  const rowsQ = useQuery({
    queryKey: ["dash-mandato-rows"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_v_mandates_full" as any)
        .select("status, exclusividade, regiao, uf, valor_pedido, data_assinatura, data_vencimento, responsavel_id, deal_kind, outcome")
        .eq("deal_kind", "mandato_assinado")
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const k = kpis.data ?? {};
  const rows = rowsQ.data ?? [];

  const byStatus = aggCount(rows, (r) => r.status ?? "—");
  const byExcl = aggCount(rows, (r) => (r.exclusividade ? "Sim" : "Não"));
  const byRegion = aggCount(rows, (r) => r.regiao ?? "—");
  const byState = aggCount(rows.filter((r) => r.status === "ativo"), (r) => r.uf ?? "—")
    .sort((a, b) => b.value - a.value).slice(0, 15);

  return (
    <DashShell
      title="Mandato"
      subtitle="Pipeline de mandatos assinados, exclusividades e equity sob gestão"
      onRefresh={() => { kpis.refetch(); rowsQ.refetch(); }}
      liveAge={kpis.dataUpdatedAt ? Math.floor((Date.now() - kpis.dataUpdatedAt) / 1000) : undefined}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DashKpi label="Total Mandatos" value={k.total_mandatos ?? 0} loading={kpis.isLoading} />
        <DashKpi label="Vendemos" value={k.vendemos ?? 0} accent="success" loading={kpis.isLoading} />
        <DashKpi label="Vigentes" value={k.vigentes ?? 0} accent="volt" loading={kpis.isLoading} />
        <DashKpi label="Em Negociação" value={k.em_negociacao ?? 0} accent="cyan" loading={kpis.isLoading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashCard title="Equity sob gestão">
          <DashKpi label="Soma valor pedido" value={Number(k.equity_sob_gestao ?? 0)} format="currency" size="hero" />
        </DashCard>
        <DashCard title="Comissão Vispe (potencial)">
          <DashKpi label="Faturamento estimado" value={Number(k.comissao_vispe ?? 0)} format="currency" size="hero" accent="volt" />
        </DashCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashCard title="Mandatos por status">
          <DashDonut data={byStatus} centerValue={byStatus.reduce((s, x) => s + x.value, 0)} centerLabel="Total" />
        </DashCard>
        <DashCard title="Possui exclusividade?">
          <DashDonut data={byExcl} centerValue={`${k.com_exclusividade ?? 0}`} centerLabel="Exclusivos" />
        </DashCard>
        <DashCard title="Mandatos por região">
          <DashDonut data={byRegion} centerValue={rows.length} centerLabel="Mandatos" />
        </DashCard>
      </div>

      <DashCard title="Mandatos vigentes por estado" span="wide">
        <DashBar data={byState} layout="horizontal" height={Math.max(280, byState.length * 22)} />
      </DashCard>
    </DashShell>
  );
}

function aggCount(rows: any[], key: (r: any) => string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}
