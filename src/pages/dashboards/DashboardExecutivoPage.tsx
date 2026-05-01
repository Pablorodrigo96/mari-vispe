import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashShell, DashCard } from "@/components/dashboards/DashShell";
import { DashKpi } from "@/components/dashboards/DashKpi";
import { DashDonut, DashStackedBar, DashLine, DashBar } from "@/components/dashboards/DashCharts";
import { AIInsightCard } from "@/components/dashboards/AIInsightCard";
import { DashboardFiltersProvider } from "@/components/dashboards/DashboardFiltersContext";
import { DashboardFilters } from "@/components/dashboards/DashboardFilters";
import { useDashboardInsight } from "@/hooks/useDashboardInsight";

const REFRESH_MS = 60_000;

export default function DashboardExecutivoPage() {
  return (
    <DashboardFiltersProvider>
      <DashboardExecutivoInner />
    </DashboardFiltersProvider>
  );
}

function DashboardExecutivoInner() {
  const exec = useQuery({
    queryKey: ["dash-exec"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_executivo" as any);
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as any;
    },
  });

  const breakdowns = useQuery({
    queryKey: ["dash-exec-breakdowns"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_v_mandates_full" as any)
        .select("deal_type, deal_kind, regiao, uf, outcome, valor_operacao, faturamento_vispe, data_assinatura, responsavel_id, deal_phase")
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const k = exec.data ?? {};
  const rows = breakdowns.data ?? [];

  // Donut: por tipo (deal_type)
  const byType = aggCount(rows, (r) => r.deal_type ?? "—");
  // Donut: fase sellside
  const sellsideRows = rows.filter((r) => r.deal_type === "sellside");
  const byPhase = aggCount(sellsideRows, (r) => r.deal_phase ?? "—");
  // Donut: por região
  const byRegion = aggCount(rows, (r) => r.regiao ?? "—");
  // Bar: por estado
  const byState = aggCount(rows, (r) => r.uf ?? "—").sort((a, b) => b.value - a.value).slice(0, 15);
  // Linha: novas operações por ano
  const byYear = aggByYear(rows);
  // Top 3 maiores
  const top3 = rows
    .filter((r) => r.valor_operacao)
    .sort((a, b) => Number(b.valor_operacao) - Number(a.valor_operacao))
    .slice(0, 3)
    .map((r, i) => ({ name: `#${i + 1}`, value: Number(r.valor_operacao) }));

  return (
    <DashShell
      title="Visão Executiva M&A"
      subtitle="Visão consolidada de todas as operações Buyside e Sellside · refresh automático a cada 60s"
      onRefresh={() => { exec.refetch(); breakdowns.refetch(); }}
      liveAge={exec.dataUpdatedAt ? Math.floor((Date.now() - exec.dataUpdatedAt) / 1000) : undefined}
    >
      {/* Linha 1 — KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <DashKpi label="Total Operações" value={k.total_operacoes ?? 0} loading={exec.isLoading} />
        <DashKpi label="Buyside" value={k.buyside ?? 0} accent="cyan" loading={exec.isLoading} />
        <DashKpi label="Sellside" value={k.sellside ?? 0} accent="volt" loading={exec.isLoading} />
        <DashKpi label="Em Andamento" value={k.em_andamento ?? 0} accent="amber" loading={exec.isLoading} />
        <DashKpi label="Concluídas" value={k.concluidas ?? 0} accent="success" loading={exec.isLoading} />
        <DashKpi label="Canceladas" value={k.canceladas ?? 0} accent="danger" loading={exec.isLoading} />
      </div>

      {/* Linha 2 — KPIs financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DashKpi label="Total das Operações" value={Number(k.valor_total_operacoes ?? 0)} format="currency" size="hero" loading={exec.isLoading} />
        <DashKpi label="Faturamento Vispe" value={Number(k.faturamento_vispe ?? 0)} format="currency" size="hero" accent="volt" loading={exec.isLoading} />
        <DashKpi label="Ticket Médio" value={Number(k.ticket_medio ?? 0)} format="currency" size="hero" accent="cyan" loading={exec.isLoading} />
      </div>

      {/* Insight IA */}
      {(k.total_operacoes ?? 0) > 0 && (
        <AIInsightCard
          body={`Você tem ${k.em_andamento ?? 0} operações em andamento gerando potencial de R$ ${((Number(k.valor_total_operacoes ?? 0)) / 1_000_000).toFixed(1)}M. ${k.sellside > k.buyside ? "Sellside lidera o portfólio." : "Buyside lidera o portfólio."}`}
        />
      )}

      {/* Linha 3 — 3 donuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashCard title="Operações por tipo">
          <DashDonut data={byType} centerValue={byType.reduce((s, x) => s + x.value, 0)} centerLabel="Total" />
          <Legend items={byType} />
        </DashCard>
        <DashCard title="Fase Sellside">
          <DashDonut data={byPhase} centerValue={sellsideRows.length} centerLabel="Sellside" />
          <Legend items={byPhase} />
        </DashCard>
        <DashCard title="Operações por região">
          <DashDonut data={byRegion} centerValue={byRegion.reduce((s, x) => s + x.value, 0)} centerLabel="Deals" />
          <Legend items={byRegion} />
        </DashCard>
      </div>

      {/* Linha 4 — Estado largura total */}
      <DashCard title="Operações por estado (top 15)" span="wide">
        <DashBar data={byState} layout="horizontal" height={Math.max(280, byState.length * 22)} />
      </DashCard>

      {/* Linha 5 — Evolução anual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashCard title="Evolução anual de novas operações">
          <DashLine data={byYear} series={[{ key: "buyside", color: "#00C2FF", label: "Buyside" }, { key: "sellside", color: "#D9F564", label: "Sellside" }]} />
        </DashCard>
        <DashCard title="3 maiores operações realizadas">
          <DashBar data={top3} highlightTop />
        </DashCard>
      </div>
    </DashShell>
  );
}

function Legend({ items }: { items: { name: string; value: number }[] }) {
  const total = items.reduce((s, x) => s + x.value, 0) || 1;
  const colors = ["#D9F564", "#00C2FF", "#00D27F", "#FFB800", "#FF3B6B", "#8B5CF6", "#A8A8A3"];
  return (
    <div className="mt-3 space-y-1.5">
      {items.slice(0, 6).map((it, i) => (
        <div key={it.name} className="flex items-center justify-between text-[11px] gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: colors[i % colors.length] }} />
            <span className="text-[#A8A8A3] truncate">{it.name}</span>
          </div>
          <span className="text-[#FAFAF7] tabular-nums font-mono">{((it.value / total) * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
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

function aggByYear(rows: any[]) {
  const map = new Map<number, { buyside: number; sellside: number }>();
  for (const r of rows) {
    const y = r.data_assinatura ? new Date(r.data_assinatura).getFullYear() : null;
    if (!y) continue;
    if (!map.has(y)) map.set(y, { buyside: 0, sellside: 0 });
    const ref = map.get(y)!;
    if (r.deal_type === "buyside") ref.buyside++;
    else if (r.deal_type === "sellside") ref.sellside++;
  }
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([year, v]) => ({ name: String(year), ...v }));
}
