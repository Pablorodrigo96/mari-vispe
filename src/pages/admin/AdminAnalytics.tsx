import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAdminAnalytics, AnalyticsRange } from "@/hooks/useAdminAnalytics";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Users, Eye, UserPlus, Target, Loader2, TrendingUp, Globe, Clock, Activity, MousePointerClick, LogOut, Smartphone, Repeat, Layers } from "lucide-react";
import { TrackingHealthCard } from "@/components/admin/analytics/TrackingHealthCard";
import { InfoHint } from "@/components/admin/analytics/InfoHint";
import { analyticsTooltips as T } from "@/lib/analyticsTooltips";

const fmt = (n: number | null | undefined) => new Intl.NumberFormat("pt-BR").format(Number(n ?? 0));
const fmtPct = (n: number | null | undefined) => `${(Number(n ?? 0)).toFixed(1)}%`;
const fmtMs = (ms: number | null | undefined) => {
  const s = Math.round(Number(ms ?? 0) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}m${r ? ` ${r}s` : ""}`;
};
const fmtDay = (d: string | undefined) => {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
};
function sliceLast<T extends { day: string }>(rows: T[] = [], days: number): T[] {
  const cutoff = Date.now() - days * 86400 * 1000;
  return rows.filter((r) => new Date(r.day).getTime() >= cutoff).sort((a, b) => a.day.localeCompare(b.day));
}
function sumBy(rows: any[] = [], key: string) { return rows.reduce((acc, r) => acc + Number(r[key] ?? 0), 0); }

const tooltipStyle = { background: "#18181b", border: "1px solid #27272a", fontSize: 12 } as const;
const DOW_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function CardTitle({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
  return (
    <div className="text-sm font-semibold mb-3 flex items-center gap-2">
      {icon}
      <span>{label}</span>
      <InfoHint text={hint} />
    </div>
  );
}

export default function AdminAnalytics() {
  const [range, setRange] = useState<AnalyticsRange>(30);
  const a = useAdminAnalytics(range);
  const { daily, topPages, sources, growth, longSessions, leadsSeries, funnel, devices, browsers, heatmap, exitPages, cta, retention } = a;

  const dailyWindow = useMemo(() => sliceLast(daily.data ?? [], range), [daily.data, range]);
  const growthWindow = useMemo(() => sliceLast(growth.data ?? [], range), [growth.data, range]);

  const kpis = useMemo(() => {
    const pv = sumBy(dailyWindow, "page_views");
    const sess = sumBy(dailyWindow, "sessions");
    const sign = sumBy(dailyWindow, "signups");
    const leads = sumBy(dailyWindow, "leads") || (leadsSeries.data ?? []).reduce((a, r) => a + r.leads, 0);
    const ppS = sess ? pv / sess : 0;
    // Tempo médio de sessão a partir de longSessions (usa média dos top — sinaliza, não exato)
    const avgMs = (longSessions.data ?? []).length
      ? (longSessions.data ?? []).reduce((a: number, r: any) => a + Number(r.duration_ms ?? 0), 0) / (longSessions.data ?? []).length
      : 0;
    return { pv, sess, sign, leads, ppS, avgMs };
  }, [dailyWindow, leadsSeries.data, longSessions.data]);

  const loading = daily.isLoading || topPages.isLoading || sources.isLoading || growth.isLoading;
  const rangeLabel = `${range} dias`;

  // Heatmap: matriz 7x24
  const heat = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 0;
    for (const r of heatmap.data ?? []) {
      const d = Math.max(0, Math.min(6, r.dow));
      const h = Math.max(0, Math.min(23, r.hour));
      grid[d][h] = r.events;
      if (r.events > max) max = r.events;
    }
    return { grid, max };
  }, [heatmap.data]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Analytics da plataforma</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Tráfego, crescimento, leads e tempo de permanência — dados próprios, com opt-out LGPD.
            </p>
          </div>
          <ToggleGroup
            type="single"
            value={String(range)}
            onValueChange={(v) => v && setRange(Number(v) as AnalyticsRange)}
            className="bg-zinc-900 border border-zinc-800 rounded-md"
          >
            <ToggleGroupItem value="7" className="text-xs data-[state=on]:bg-[#D9F564] data-[state=on]:text-zinc-900">7d</ToggleGroupItem>
            <ToggleGroupItem value="30" className="text-xs data-[state=on]:bg-[#D9F564] data-[state=on]:text-zinc-900">30d</ToggleGroupItem>
            <ToggleGroupItem value="90" className="text-xs data-[state=on]:bg-[#D9F564] data-[state=on]:text-zinc-900">90d</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> carregando…
          </div>
        )}

        {/* Saúde do tracking */}
        <TrackingHealthCard />

        {/* Visão geral — KPIs */}
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold pt-2">Visão geral</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi icon={<Eye className="h-4 w-4" />} label={`Page views (${rangeLabel})`} value={fmt(kpis.pv)} hint={T.pageViews} />
          <Kpi icon={<Users className="h-4 w-4" />} label={`Sessões (${rangeLabel})`} value={fmt(kpis.sess)} hint={T.sessions} />
          <Kpi icon={<Layers className="h-4 w-4" />} label="Páginas / sessão" value={kpis.ppS.toFixed(2)} hint={T.pagesPerSession} />
          <Kpi icon={<Clock className="h-4 w-4" />} label="Tempo médio sessão" value={fmtMs(kpis.avgMs)} hint={T.avgSessionTime} />
          <Kpi icon={<UserPlus className="h-4 w-4" />} label={`Novos usuários (${rangeLabel})`} value={fmt(kpis.sign)} accent hint={T.signups} />
          <Kpi icon={<Target className="h-4 w-4" />} label={`Leads (${rangeLabel})`} value={fmt(kpis.leads)} accent hint={T.leads} />
        </div>

        {/* Funil 30d */}
        <Card className="p-4 bg-zinc-900/60 border-zinc-800">
          <CardTitle icon={<TrendingUp className="h-4 w-4 text-emerald-400" />} label="Funil de engajamento (30 dias)" hint={T.funnel} />
          <FunnelStrip data={funnel.data} />
        </Card>

        {/* Tendências */}
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold pt-2">Tendências</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <CardTitle icon={<TrendingUp className="h-4 w-4 text-emerald-400" />} label={`Crescimento de usuários (${rangeLabel})`} hint={T.growth} />
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={growthWindow}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickFormatter={fmtDay} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtDay} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="cumulative_users" stroke="#10b981" fill="#10b98133" name="Total" />
                  <Area type="monotone" dataKey="new_users" stroke="#34d399" fill="#34d39955" name="Novos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <CardTitle icon={<Activity className="h-4 w-4 text-emerald-400" />} label={`Atividade diária (${rangeLabel})`} hint={T.daily} />
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={dailyWindow}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickFormatter={fmtDay} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtDay} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="page_views" stroke="#60a5fa" name="Page views" dot={false} />
                  <Line type="monotone" dataKey="sessions" stroke="#a78bfa" name="Sessões" dot={false} />
                  <Line type="monotone" dataKey="signups" stroke="#10b981" name="Signups" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <CardTitle icon={<Eye className="h-4 w-4 text-[#D9F564]" />} label={`Page views por dia (${rangeLabel})`} hint={T.pageViewsDaily} />
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={dailyWindow}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickFormatter={fmtDay} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtDay} />
                  <Bar dataKey="page_views" fill="#D9F564" name="Page views" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <CardTitle icon={<Target className="h-4 w-4 text-emerald-400" />} label={`Leads por dia (${rangeLabel})`} hint={T.leadsDaily} />
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={leadsSeries.data ?? []}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickFormatter={fmtDay} />
                  <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtDay} />
                  <Bar dataKey="leads" fill="#10b981" name="Leads" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Comportamento */}
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold pt-2">Comportamento</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Heatmap */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800 lg:col-span-2">
            <CardTitle icon={<Activity className="h-4 w-4 text-emerald-400" />} label="Heatmap por hora × dia da semana (30d)" hint={T.heatmap} />
            <div className="overflow-x-auto">
              <table className="text-[10px] tabular-nums">
                <thead>
                  <tr>
                    <th className="text-zinc-500 pr-2"></th>
                    {Array.from({ length: 24 }, (_, h) => (
                      <th key={h} className="text-zinc-500 font-normal w-7 text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DOW_LABEL.map((label, d) => (
                    <tr key={d}>
                      <td className="text-zinc-400 pr-2 text-right">{label}</td>
                      {Array.from({ length: 24 }, (_, h) => {
                        const v = heat.grid[d][h];
                        const intensity = heat.max ? v / heat.max : 0;
                        const bg = `rgba(217,245,100,${0.05 + intensity * 0.85})`;
                        return (
                          <td key={h} className="w-7 h-6 text-center text-zinc-900 border border-zinc-900"
                              style={{ background: v ? bg : "#0e0e10" }}
                              title={`${label} ${h}h: ${v} eventos`}>
                            {v && intensity > 0.5 ? v : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Exit pages */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <CardTitle icon={<LogOut className="h-4 w-4 text-amber-400" />} label="Páginas de saída (30d)" hint={T.exitPages} />
            <div className="overflow-auto max-h-80 rounded border border-zinc-800">
              <table className="w-full text-xs">
                <thead className="bg-zinc-900 sticky top-0 text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Caminho</th>
                    <th className="px-3 py-2 text-right">Saídas</th>
                  </tr>
                </thead>
                <tbody>
                  {(exitPages.data ?? []).map((r: any, i: number) => (
                    <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                      <td className="px-3 py-2 text-zinc-200 truncate max-w-[260px] break-words">{r.path}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-300">{fmt(r.exits)}</td>
                    </tr>
                  ))}
                  {!(exitPages.data ?? []).length && (
                    <tr><td colSpan={2} className="px-3 py-6 text-center text-zinc-500">Sem dados ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* CTA */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <CardTitle icon={<MousePointerClick className="h-4 w-4 text-[#D9F564]" />} label="Conversões CTA (30d)" hint={T.cta} />
            <div className="overflow-auto max-h-80 rounded border border-zinc-800">
              <table className="w-full text-xs">
                <thead className="bg-zinc-900 sticky top-0 text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 text-left">CTA</th>
                    <th className="px-3 py-2 text-right">Cliques</th>
                    <th className="px-3 py-2 text-right">Sessões</th>
                  </tr>
                </thead>
                <tbody>
                  {(cta.data ?? []).map((r: any, i: number) => (
                    <tr key={i} className="border-t border-zinc-800">
                      <td className="px-3 py-2 text-zinc-200 truncate max-w-[260px] break-words">{r.cta}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(r.clicks)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{fmt(r.unique_sessions)}</td>
                    </tr>
                  ))}
                  {!(cta.data ?? []).length && (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-zinc-500">Nenhum CTA rastreado ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Tráfego */}
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold pt-2">Tráfego e perfil</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <CardTitle icon={<Eye className="h-4 w-4 text-emerald-400" />} label="Páginas mais vistas (30 dias)" hint={T.topPages} />
            <div className="overflow-auto max-h-96 rounded border border-zinc-800">
              <table className="w-full text-xs">
                <thead className="bg-zinc-900 sticky top-0 text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Caminho</th>
                    <th className="px-3 py-2 text-right">Views</th>
                    <th className="px-3 py-2 text-right">Sessões</th>
                    <th className="px-3 py-2 text-right">Tempo médio</th>
                  </tr>
                </thead>
                <tbody>
                  {(topPages.data ?? []).map((r, i) => (
                    <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                      <td className="px-3 py-2 text-zinc-200 truncate max-w-[260px] break-words">{r.path}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(r.views)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(r.unique_sessions)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{fmtMs(r.avg_duration_ms)}</td>
                    </tr>
                  ))}
                  {!(topPages.data ?? []).length && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-zinc-500">Sem dados ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <CardTitle icon={<Globe className="h-4 w-4 text-emerald-400" />} label="Fontes de tráfego (30 dias)" hint={T.sources} />
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart data={sources.data ?? []} layout="vertical">
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis type="number" stroke="#71717a" fontSize={11} />
                  <YAxis type="category" dataKey="source" stroke="#71717a" fontSize={11} width={120} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="sessions" fill="#10b981" name="Sessões" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <CardTitle icon={<Smartphone className="h-4 w-4 text-emerald-400" />} label="Dispositivos (30 dias)" hint={T.devices} />
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={devices.data ?? []}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis dataKey="device" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="sessions" fill="#60a5fa" name="Sessões" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <CardTitle icon={<Globe className="h-4 w-4 text-emerald-400" />} label="Navegadores (30 dias)" hint={T.browsers} />
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={browsers.data ?? []}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis dataKey="browser" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="sessions" fill="#a78bfa" name="Sessões" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Retenção */}
        <Card className="p-4 bg-zinc-900/60 border-zinc-800">
          <CardTitle icon={<Repeat className="h-4 w-4 text-emerald-400" />} label="Retenção D1 / D7 (cohort 60d)" hint={T.retention} />
          <div className="grid grid-cols-3 gap-3 mt-2">
            <Mini label="Cohort" value={fmt(retention.data?.cohort)} />
            <Mini label="Voltam em D+1" value={retention.data?.d1_pct != null ? fmtPct(retention.data.d1_pct) : "—"} accent />
            <Mini label="Voltam em D+7" value={retention.data?.d7_pct != null ? fmtPct(retention.data.d7_pct) : "—"} accent />
          </div>
        </Card>

        {/* Sessões longas */}
        <Card className="p-4 bg-zinc-900/60 border-zinc-800">
          <CardTitle icon={<Clock className="h-4 w-4 text-emerald-400" />} label="Permanências mais longas (top 20)" hint={T.longSessions} />
          <div className="overflow-auto max-h-80 rounded border border-zinc-800">
            <table className="w-full text-xs">
              <thead className="bg-zinc-900 sticky top-0 text-zinc-400">
                <tr>
                  <th className="px-3 py-2 text-left">Página</th>
                  <th className="px-3 py-2 text-left">Sessão</th>
                  <th className="px-3 py-2 text-left">Usuário</th>
                  <th className="px-3 py-2 text-right">Tempo</th>
                  <th className="px-3 py-2 text-left">Quando</th>
                </tr>
              </thead>
              <tbody>
                {(longSessions.data ?? []).map((r: any, i: number) => (
                  <tr key={i} className="border-t border-zinc-800">
                    <td className="px-3 py-2 text-zinc-200 truncate max-w-[260px] break-words">{r.path}</td>
                    <td className="px-3 py-2 text-zinc-500 font-mono text-[10px]">{String(r.session_key ?? "").slice(0, 8)}…</td>
                    <td className="px-3 py-2 text-zinc-500 font-mono text-[10px]">{r.user_id ? String(r.user_id).slice(0, 8) + "…" : <span className="text-zinc-700">anon</span>}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{fmtMs(r.duration_ms)}</td>
                    <td className="px-3 py-2 text-zinc-500">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
                {!(longSessions.data ?? []).length && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">Sem sessões registradas ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, accent, hint }: { icon: React.ReactNode; label: string; value: string; accent?: boolean; hint?: string }) {
  return (
    <div className={`rounded-md border p-3 ${accent ? "border-emerald-900/60 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900/60"}`}>
      <div className={`text-[10px] uppercase tracking-wide flex items-center gap-1 ${accent ? "text-emerald-300" : "text-zinc-500"}`}>
        {icon} <span className="truncate">{label}</span>
        {hint && <span className="ml-auto"><InfoHint text={hint} /></span>}
      </div>
      <div className={`text-xl font-bold tabular-nums mt-1 ${accent ? "text-emerald-300" : "text-zinc-100"}`}>{value}</div>
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${accent ? "border-emerald-900/60 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900/60"}`}>
      <div className={`text-[10px] uppercase tracking-wide ${accent ? "text-emerald-300" : "text-zinc-500"}`}>{label}</div>
      <div className={`text-xl font-bold tabular-nums mt-1 ${accent ? "text-emerald-300" : "text-zinc-100"}`}>{value}</div>
    </div>
  );
}

function FunnelStrip({ data }: { data: any }) {
  const sessions = Number(data?.sessions ?? 0);
  const sess30 = Number(data?.sessions_over_30s ?? 0);
  const signups = Number(data?.signups ?? 0);
  const leads = Number(data?.leads ?? 0);
  const stages = [
    { label: "Sessões", value: sessions, base: sessions },
    { label: "Sessões > 30s", value: sess30, base: sessions },
    { label: "Signups", value: signups, base: sessions },
    { label: "Leads", value: leads, base: sessions },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {stages.map((s, i) => {
        const pct = s.base ? (s.value / s.base) * 100 : 0;
        return (
          <div key={s.label} className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">{s.label}</div>
            <div className="text-2xl font-bold tabular-nums text-zinc-100 mt-1">{fmt(s.value)}</div>
            <div className="text-[10px] text-emerald-300 mt-0.5">{i === 0 ? "—" : `${pct.toFixed(1)}% do topo`}</div>
            <div className="h-1 bg-zinc-800 rounded mt-2 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
