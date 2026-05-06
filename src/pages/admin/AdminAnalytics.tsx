import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAdminAnalytics, AnalyticsRange } from "@/hooks/useAdminAnalytics";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Users, Eye, UserPlus, Target, Loader2, TrendingUp, Globe, Clock, Activity } from "lucide-react";

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR").format(Number(n ?? 0));

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
  return rows
    .filter((r) => new Date(r.day).getTime() >= cutoff)
    .sort((a, b) => a.day.localeCompare(b.day));
}

function sumBy(rows: any[] = [], key: string) {
  return rows.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);
}

const tooltipStyle = { background: "#18181b", border: "1px solid #27272a", fontSize: 12 } as const;

export default function AdminAnalytics() {
  const [range, setRange] = useState<AnalyticsRange>(30);
  const { daily, topPages, sources, growth, longSessions, leadsSeries } = useAdminAnalytics(range);

  const dailyWindow = useMemo(() => sliceLast(daily.data ?? [], range), [daily.data, range]);
  const growthWindow = useMemo(() => sliceLast(growth.data ?? [], range), [growth.data, range]);

  const kpis = useMemo(() => ({
    pv: sumBy(dailyWindow, "page_views"),
    sess: sumBy(dailyWindow, "sessions"),
    sign: sumBy(dailyWindow, "signups"),
    leads: sumBy(dailyWindow, "leads") || (leadsSeries.data ?? []).reduce((a, r) => a + r.leads, 0),
  }), [dailyWindow, leadsSeries.data]);

  const loading = daily.isLoading || topPages.isLoading || sources.isLoading || growth.isLoading;
  const rangeLabel = `${range} dias`;

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Kpi icon={<Eye className="h-4 w-4" />} label={`Page views (${rangeLabel})`} value={fmt(kpis.pv)} />
          <Kpi icon={<Users className="h-4 w-4" />} label={`Sessões (${rangeLabel})`} value={fmt(kpis.sess)} />
          <Kpi icon={<UserPlus className="h-4 w-4" />} label={`Novos usuários (${rangeLabel})`} value={fmt(kpis.sign)} accent />
          <Kpi icon={<Target className="h-4 w-4" />} label={`Leads (${rangeLabel})`} value={fmt(kpis.leads)} accent />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Crescimento de usuários */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Crescimento de usuários ({rangeLabel})
            </div>
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

          {/* Atividade diária */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Atividade diária ({rangeLabel})
            </div>
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

          {/* Page views por dia */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#D9F564]" />
              Page views por dia ({rangeLabel})
            </div>
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

          {/* Leads por dia */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-400" />
              Leads por dia ({rangeLabel})
            </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top páginas */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-400" /> Páginas mais vistas (30 dias)
            </div>
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
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-zinc-500">Sem dados ainda — visitas começarão a aparecer aqui.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Fontes de tráfego */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-400" /> Fontes de tráfego (30 dias)
            </div>
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
        </div>

        {/* Sessões longas */}
        <Card className="p-4 bg-zinc-900/60 border-zinc-800">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400" /> Permanências mais longas (top 20)
          </div>
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

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${accent ? "border-emerald-900/60 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900/60"}`}>
      <div className={`text-[10px] uppercase tracking-wide flex items-center gap-1 ${accent ? "text-emerald-300" : "text-zinc-500"}`}>
        {icon} {label}
      </div>
      <div className={`text-xl font-bold tabular-nums mt-1 ${accent ? "text-emerald-300" : "text-zinc-100"}`}>
        {value}
      </div>
    </div>
  );
}
