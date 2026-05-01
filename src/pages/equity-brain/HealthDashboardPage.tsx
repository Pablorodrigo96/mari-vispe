import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Loader2, Activity, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Row = {
  function_name: string;
  total_runs: number;
  ok_runs: number;
  error_runs: number;
  success_rate_pct: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
  last_run_at: string | null;
  last_error: string | null;
  status_color: "green" | "yellow" | "red";
};

type ErrRow = {
  ts: string;
  function_name: string;
  status: string;
  duration_ms: number | null;
  error_text: string | null;
  request_id: string | null;
};

const colorMap: Record<string, string> = {
  green: "bg-emerald-500/10 text-emerald-300 border-emerald-700/40",
  yellow: "bg-amber-500/10 text-amber-300 border-amber-700/40",
  red: "bg-rose-500/10 text-rose-300 border-rose-700/40",
};

export default function HealthDashboardPage() {
  const { roles, loading: rolesLoading } = useUserRoles();
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<ErrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = roles.includes("admin");

  async function load() {
    setRefreshing(true);
    const [{ data: r }, { data: e }] = await Promise.all([
      (supabase.rpc as any)("get_health_summary_24h"),
      (supabase.rpc as any)("get_health_recent_errors", { limit_n: 50 }),
    ]);
    setRows((r as Row[]) ?? []);
    setErrors((e as ErrRow[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    if (!rolesLoading && isAdmin) load();
    const i = setInterval(() => { if (isAdmin) load(); }, 60_000);
    return () => clearInterval(i);
  }, [rolesLoading, isAdmin]);

  if (rolesLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando saúde do sistema…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 text-zinc-400">Acesso restrito a administradores.</div>
    );
  }

  const totalFns = rows.length;
  const greenFns = rows.filter(r => r.status_color === "green").length;
  const redFns = rows.filter(r => r.status_color === "red").length;
  const yellowFns = rows.filter(r => r.status_color === "yellow").length;

  return (
    <div className="p-6 space-y-6 text-zinc-200 max-w-[1400px] mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-400" />
            Saúde das Funções (24h)
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Monitoramento das edge functions críticas — instrumentadas via <code className="text-xs bg-zinc-900 px-1.5 py-0.5 rounded">withObservability</code>.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          onClick={load}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Funções monitoradas" value={totalFns} color="text-zinc-100" />
        <KpiCard label="Verde" value={greenFns} color="text-emerald-400" />
        <KpiCard label="Amarelo" value={yellowFns} color="text-amber-400" />
        <KpiCard label="Vermelho" value={redFns} color="text-rose-400" />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Por função
        </h2>
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/60">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-zinc-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Função</th>
                <th className="text-right px-4 py-2.5">Runs</th>
                <th className="text-right px-4 py-2.5">Sucesso</th>
                <th className="text-right px-4 py-2.5">p50</th>
                <th className="text-right px-4 py-2.5">p95</th>
                <th className="text-left px-4 py-2.5">Últ. run</th>
                <th className="text-left px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Nenhuma execução registrada nas últimas 24h. Aguarde tráfego ou rode um smoke test.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.function_name} className="border-t border-zinc-900 hover:bg-zinc-900/40">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-100 break-words">
                    {r.function_name}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{r.total_runs}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                    {r.success_rate_pct != null ? `${Number(r.success_rate_pct).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-400">{r.p50_ms ?? "—"}ms</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-400">{r.p95_ms ?? "—"}ms</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {r.last_run_at
                      ? formatDistanceToNow(new Date(r.last_run_at), { addSuffix: true, locale: ptBR })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-1 rounded border font-medium ${colorMap[r.status_color] ?? colorMap.green}`}>
                      {r.status_color === "green" && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                      {r.status_color !== "green" && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                      {r.status_color}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Últimos erros (7 dias)
        </h2>
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/60">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-zinc-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Quando</th>
                <th className="text-left px-4 py-2.5">Função</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Duração</th>
                <th className="text-left px-4 py-2.5">Erro</th>
              </tr>
            </thead>
            <tbody>
              {errors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-emerald-400">
                    🎉 Nenhum erro nos últimos 7 dias
                  </td>
                </tr>
              )}
              {errors.map((e, i) => (
                <tr key={i} className="border-t border-zinc-900 hover:bg-zinc-900/40">
                  <td className="px-4 py-2 text-xs text-zinc-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(e.ts), { addSuffix: true, locale: ptBR })}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-200">{e.function_name}</td>
                  <td className="px-4 py-2">
                    <span className="text-[10px] uppercase font-semibold text-rose-300">{e.status}</span>
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-zinc-400 tabular-nums">{e.duration_ms ?? "—"}ms</td>
                  <td className="px-4 py-2 text-xs text-rose-300/80 break-words max-w-[600px]">
                    {e.error_text ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-3xl font-bold tabular-nums mt-1 ${color}`}>{value}</div>
    </div>
  );
}
