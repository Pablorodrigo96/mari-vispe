import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { KpiTile } from "@/components/equity-brain/crm/exec/KpiTile";
import { ChartCard } from "@/components/equity-brain/crm/exec/ChartCard";
import { DonutChart } from "@/components/equity-brain/crm/exec/DonutChart";
import { StatusBarChart, YearlyEvolutionChart } from "@/components/equity-brain/crm/exec/StatusByYearChart";
import { YearlyMoneyChart } from "@/components/equity-brain/crm/exec/YearlyMoneyChart";
import { StackedLocalityChart } from "@/components/equity-brain/crm/exec/StackedLocalityChart";
import { brl, DEAL_TYPE_LABEL, OUTCOME_LABEL, OUTCOME_COLOR, REGIAO_BY_UF, PIPELINE_STAGE_LABEL } from "@/lib/dealFormatters";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowLeft, TrendingUp } from "lucide-react";

const COLORS_OUTCOME = Object.values(OUTCOME_COLOR);


export default function ExecutiveDashboardPage() {
  const kpis = useQuery({
    queryKey: ["eb-exec-kpis"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("eb_dashboard_kpis");
      if (error) throw error;
      return (data ?? {}) as Record<string, any>;
    },
  });

  const deals = useQuery({
    queryKey: ["eb-exec-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_v_deal_metrics" as any)
        .select("*")
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const responsaveis = useQuery({
    queryKey: ["eb-exec-resp"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return data ?? [];
    },
  });

  const k = kpis.data ?? {};
  const rows = (deals.data ?? []) as any[];

  // Agregações no cliente (200 mandatos é leve)
  const byTipo = aggregate(rows, (r) => r.deal_type, "count");
  const byOutcome = aggregate(rows, (r) => r.outcome, "count");
  const byRegiao = aggregate(rows, (r) => r.regiao || REGIAO_BY_UF[r.uf] || "—", "count");
  const byUF = aggregate(rows, (r) => r.uf || "—", "count").slice(0, 25);
  const exclusiv = [
    { name: "Sim", value: rows.filter((r) => r.exclusividade).length },
    { name: "Não", value: rows.filter((r) => !r.exclusividade).length },
  ];

  // Status por tipo
  const statusByType = ["em_andamento", "concluido", "cancelado"].map((s) => ({
    status: OUTCOME_LABEL[s],
    buyside: rows.filter((r) => r.outcome === s && r.deal_type === "buyside").length,
    sellside: rows.filter((r) => r.outcome === s && r.deal_type === "sellside").length,
  }));

  // Evolução anual
  const yearMap = new Map<string, { buyside: number; sellside: number }>();
  rows.forEach((r) => {
    const y = String(r.year_started ?? "—");
    if (!yearMap.has(y)) yearMap.set(y, { buyside: 0, sellside: 0 });
    const slot = yearMap.get(y)!;
    if (r.deal_type === "buyside") slot.buyside++;
    else if (r.deal_type === "sellside") slot.sellside++;
  });
  const yearly = Array.from(yearMap.entries())
    .filter(([y]) => y !== "—")
    .sort()
    .map(([year, v]) => ({ year, ...v }));

  // Top 3 deals
  const top3 = [...rows]
    .filter((r) => Number(r.valor_operacao) > 0)
    .sort((a, b) => Number(b.valor_operacao) - Number(a.valor_operacao))
    .slice(0, 3);

  // Por responsável
  const respMap = new Map<string, string>();
  (responsaveis.data ?? []).forEach((p: any) => respMap.set(p.user_id, p.full_name || "Sem nome"));
  const byResp: Record<string, { name: string; concluido: number; em_andamento: number; cancelado: number; total: number }> = {};
  rows.forEach((r) => {
    if (!r.responsavel_id) return;
    const name = respMap.get(r.responsavel_id) || r.responsavel_id.slice(0, 6);
    if (!byResp[name]) byResp[name] = { name, concluido: 0, em_andamento: 0, cancelado: 0, total: 0 };
    if (r.outcome === "concluido") byResp[name].concluido++;
    else if (r.outcome === "em_andamento") byResp[name].em_andamento++;
    else if (r.outcome === "cancelado") byResp[name].cancelado++;
    byResp[name].total++;
  });
  const respList = Object.values(byResp).sort((a, b) => b.total - a.total).slice(0, 12);

  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-full">
      <header className="flex items-end justify-between">
        <div>
          <Link to="/equity-brain/crm" className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> CRM
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[#D9F564]" />
            Dashboard Executivo M&amp;A
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Visão consolidada de todas as operações Buyside e Sellside.
          </p>
        </div>
        <Link
          to="/equity-brain/crm/matching"
          className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 bg-transparent"
        >
          Match Analytics →
        </Link>
      </header>

      {/* Linha 1 — Operacionais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiTile label="Total Operações" value={fmt(k.total_operations)} loading={kpis.isLoading} />
        <KpiTile label="Buyside" value={fmt(k.buyside)} accent="primary" loading={kpis.isLoading} />
        <KpiTile label="Sellside" value={fmt(k.sellside)} accent="success" loading={kpis.isLoading} />
        <KpiTile label="Em andamento" value={fmt(k.em_andamento)} accent="warning" loading={kpis.isLoading} />
        <KpiTile label="Concluídas" value={fmt(k.concluido)} accent="success" loading={kpis.isLoading} />
        <KpiTile label="Canceladas" value={fmt(k.cancelado)} accent="danger" loading={kpis.isLoading} />
      </div>

      {/* Linha 2 — Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiTile
          label="Total das operações"
          value={brl(k.total_value, { compact: true })}
          hint="Soma de operações concluídas"
          accent="primary"
          loading={kpis.isLoading}
        />
        <KpiTile
          label="Faturamento mari"
          value={brl(k.total_commission, { compact: true })}
          hint="Comissões recebidas"
          accent="success"
          loading={kpis.isLoading}
        />
        <KpiTile
          label="Ticket médio"
          value={brl(k.avg_ticket, { compact: true })}
          hint={`Tempo médio fechamento: ${k.avg_months_close ?? "—"} meses`}
          loading={kpis.isLoading}
        />
      </div>

      {/* Linha 3 — Status + Evolução */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Status das operações">
          <StatusBarChart data={statusByType} />
        </ChartCard>
        <ChartCard title="Evolução anual de novas operações">
          {yearly.length > 0 ? (
            <YearlyEvolutionChart data={yearly} />
          ) : (
            <EmptyState text="Sem data de início preenchida nos mandatos." />
          )}
        </ChartCard>
      </div>

      {/* Linha 4 — Donuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Operações por tipo">
          <DonutChart data={byTipo.map((d) => ({ name: DEAL_TYPE_LABEL[d.label] || d.label, value: d.value }))} />
        </ChartCard>
        <ChartCard title="Operações por região">
          <DonutChart data={byRegiao} />
        </ChartCard>
        <ChartCard title="Mandatos com exclusividade?">
          <DonutChart data={exclusiv} colors={["#10b981", "#ef4444"]} />
        </ChartCard>
      </div>

      {/* Linha 5 — Estado + Top3 + Responsável */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Operações por estado">
          {byUF.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byUF}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 10 }} angle={-45} textAnchor="end" height={60} interval={0} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", fontSize: 12 }} />
                <Bar dataKey="value" fill="#1d4ed8" name="Operações" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Preencha o UF dos mandatos." />
          )}
        </ChartCard>
        <ChartCard title="Top 3 maiores operações">
          {top3.length > 0 ? (
            <div className="space-y-3 py-2">
              {top3.map((d, i) => (
                <Link
                  key={d.id}
                  to={`/equity-brain/crm/mandate/${d.id}`}
                  className="flex items-center justify-between p-3 rounded bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-xl font-bold text-[#D9F564] tabular-nums w-6">{i + 1}º</div>
                    <div className="min-w-0">
                      <div className="text-sm text-zinc-100 font-medium truncate break-words">{d.company_name || d.company_cnpj}</div>
                      <div className="text-[10px] text-zinc-500 uppercase">{DEAL_TYPE_LABEL[d.deal_type]} · {d.uf || "—"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-300 tabular-nums">{brl(d.valor_operacao, { compact: true })}</div>
                    <div className="text-[10px] text-zinc-500">Comissão {brl(d.faturamento_vispe, { compact: true })}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState text="Nenhuma operação concluída com valor preenchido." />
          )}
        </ChartCard>
      </div>

      {/* Linha 6 — Responsável */}
      <ChartCard title="Projetos por responsável">
        {respList.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={respList}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} angle={-30} textAnchor="end" height={70} interval={0} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", fontSize: 12 }} />
              <Bar dataKey="cancelado" stackId="a" fill="#ef4444" name="Cancelado" />
              <Bar dataKey="em_andamento" stackId="a" fill="#f59e0b" name="Em andamento" />
              <Bar dataKey="concluido" stackId="a" fill="#10b981" name="Concluído" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text="Nenhum responsável atribuído ainda." />
        )}
      </ChartCard>

      {/* Linha 7 — Status outcome */}
      <ChartCard title="Distribuição completa de status">
        <DonutChart
          data={byOutcome.map((d) => ({ name: OUTCOME_LABEL[d.label] || d.label, value: d.value }))}
          colors={COLORS_OUTCOME}
        />
      </ChartCard>
    </div>
  );
}

function aggregate<T>(rows: T[], key: (r: T) => string | null | undefined, _mode: "count") {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const k = key(r) || "—";
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ name: label, label, value }))
    .sort((a, b) => b.value - a.value);
}

function fmt(n: any) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("pt-BR");
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-xs text-zinc-500 break-words text-center px-4">
      {text}
    </div>
  );
}
