import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Users, Eye, UserPlus, Target, Loader2, TrendingUp, Globe, Clock } from "lucide-react";

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR").format(Number(n ?? 0));

const fmtMs = (ms: number | null | undefined) => {
  const s = Math.round(Number(ms ?? 0) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}m${r ? ` ${r}s` : ""}`;
};

function sumSince(rows: any[] = [], days: number, key: string) {
  const cutoff = Date.now() - days * 86400 * 1000;
  return rows
    .filter((r) => new Date(r.day).getTime() >= cutoff)
    .reduce((acc, r) => acc + Number(r[key] ?? 0), 0);
}

export default function AdminAnalytics() {
  const { daily, topPages, sources, growth, longSessions } = useAdminAnalytics();

  const kpis = useMemo(() => {
    const d = daily.data ?? [];
    return {
      pv7: sumSince(d, 7, "page_views"),
      pv30: sumSince(d, 30, "page_views"),
      sess7: sumSince(d, 7, "sessions"),
      sess30: sumSince(d, 30, "sessions"),
      sign7: sumSince(d, 7, "signups"),
      sign30: sumSince(d, 30, "signups"),
      lead7: sumSince(d, 7, "leads"),
      lead30: sumSince(d, 30, "leads"),
    };
  }, [daily.data]);

  const loading = daily.isLoading || topPages.isLoading || sources.isLoading || growth.isLoading;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Analytics da plataforma</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Tráfego, crescimento, leads e tempo de permanência — dados próprios, sem GA.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> carregando…
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Kpi icon={<Eye className="h-4 w-4" />} label="Page views (7d / 30d)"
               value={`${fmt(kpis.pv7)} / ${fmt(kpis.pv30)}`} />
          <Kpi icon={<Users className="h-4 w-4" />} label="Sessões (7d / 30d)"
               value={`${fmt(kpis.sess7)} / ${fmt(kpis.sess30)}`} />
          <Kpi icon={<UserPlus className="h-4 w-4" />} label="Novos usuários (7d / 30d)"
               value={`${fmt(kpis.sign7)} / ${fmt(kpis.sign30)}`} accent />
          <Kpi icon={<Target className="h-4 w-4" />} label="Leads (7d / 30d)"
               value={`${fmt(kpis.lead7)} / ${fmt(kpis.lead30)}`} accent />
        </div>

        {/* Crescimento de usuários */}
        <Card className="p-4 bg-zinc-900/60 border-zinc-800">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Crescimento de usuários (90 dias)
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={growth.data ?? []}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", fontSize: 12 }} />
                <Area type="monotone" dataKey="cumulative_users" stroke="#10b981" fill="#10b98133" name="Total" />
                <Area type="monotone" dataKey="new_users" stroke="#34d399" fill="#34d39955" name="Novos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Atividade diária */}
        <Card className="p-4 bg-zinc-900/60 border-zinc-800">
          <div className="text-sm font-semibold mb-3">Atividade diária (90 dias)</div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={daily.data ?? []}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="page_views" stroke="#60a5fa" name="Page views" dot={false} />
                <Line type="monotone" dataKey="sessions" stroke="#a78bfa" name="Sessões" dot={false} />
                <Line type="monotone" dataKey="signups" stroke="#10b981" name="Signups" dot={false} />
                <Line type="monotone" dataKey="leads" stroke="#f59e0b" name="Leads" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

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
                      <td className="px-3 py-2 text-zinc-200 truncate max-w-[260px]">{r.path}</td>
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
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", fontSize: 12 }} />
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
                    <td className="px-3 py-2 text-zinc-200 truncate max-w-[260px]">{r.path}</td>
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
