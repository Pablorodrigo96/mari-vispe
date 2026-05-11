import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { UserPlus, Repeat, Globe, Sparkles } from "lucide-react";
import { InfoHint } from "@/components/equity-brain/InfoHint";

const fmt = (n: number | null | undefined) => new Intl.NumberFormat("pt-BR").format(Number(n ?? 0));
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—");
const fmtDay = (d: string | undefined) => {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
};
const tooltipStyle = { background: "#18181b", border: "1px solid #27272a", fontSize: 12 } as const;

interface Props {
  range: 7 | 30 | 90;
  visitorsDaily: any[];
  newVsReturning: any[];
  sourcesSplit: any[];
  conversion: any;
}

export function VisitorsSection({ range, visitorsDaily, newVsReturning, sourcesSplit, conversion }: Props) {
  const window = useMemo(() => {
    const cutoff = Date.now() - range * 86400 * 1000;
    return (visitorsDaily ?? [])
      .filter((r) => new Date(r.day).getTime() >= cutoff)
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [visitorsDaily, range]);

  const summary = useMemo(() => {
    const row = (newVsReturning ?? []).find((r) => Number(r.window_days) === range);
    return {
      novos: Number(row?.new_visitors ?? 0),
      recorrentes: Number(row?.returning_visitors ?? 0),
      total: Number(row?.total_visitors ?? 0),
    };
  }, [newVsReturning, range]);

  const topSources = useMemo(() => (sourcesSplit ?? []).slice(0, 10), [sourcesSplit]);

  return (
    <>
      <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold pt-2 flex items-center gap-2">
        Visitantes — Novos vs Recorrentes
        <InfoHint text="Distingue quem veio pela primeira vez (cookie persistente novo) de quem já tinha visitado antes. Dados a partir do momento em que esta funcionalidade foi ativada." />
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resumo */}
        <Card className="p-4 bg-zinc-900/60 border-zinc-800 lg:col-span-1">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#D9F564]" /> Últimos {range} dias
          </div>
          <div className="space-y-3">
            <Row icon={<UserPlus className="h-4 w-4 text-emerald-400" />} label="Visitantes novos" value={fmt(summary.novos)} sub={pct(summary.novos, summary.total) + " do total"} />
            <Row icon={<Repeat className="h-4 w-4 text-blue-400" />} label="Visitantes recorrentes" value={fmt(summary.recorrentes)} sub={pct(summary.recorrentes, summary.total) + " do total"} />
            <Row icon={<Globe className="h-4 w-4 text-zinc-300" />} label="Visitantes únicos (total)" value={fmt(summary.total)} />
          </div>

          {conversion && (
            <div className="mt-4 pt-4 border-t border-zinc-800 space-y-1.5 text-xs">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Conversão dos novos (30d)</div>
              <div className="flex justify-between"><span className="text-zinc-400">Logaram</span><span className="tabular-nums text-zinc-200">{pct(Number(conversion.became_authenticated ?? 0), Number(conversion.new_visitors ?? 0))}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Cadastraram</span><span className="tabular-nums text-emerald-300">{pct(Number(conversion.signups ?? 0), Number(conversion.new_visitors ?? 0))}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Viraram lead</span><span className="tabular-nums text-[#D9F564]">{pct(Number(conversion.leads ?? 0), Number(conversion.new_visitors ?? 0))}</span></div>
            </div>
          )}
        </Card>

        {/* Chart empilhado */}
        <Card className="p-4 bg-zinc-900/60 border-zinc-800 lg:col-span-2">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            Visitantes por dia
            <InfoHint text="Visitantes únicos diários, separados por novos (1ª visita) vs recorrentes." />
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={window}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickFormatter={fmtDay} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtDay} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="new_visitors" stackId="1" stroke="#10b981" fill="#10b98155" name="Novos" />
                <Area type="monotone" dataKey="returning_visitors" stackId="1" stroke="#60a5fa" fill="#60a5fa55" name="Recorrentes" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tabela de fontes splittada */}
      <Card className="p-4 bg-zinc-900/60 border-zinc-800">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          Origem do tráfego — split novos vs recorrentes (30d)
          <InfoHint text="Para cada fonte (UTM ou referrer), quantos visitantes únicos vieram pela primeira vez vs já conheciam. Útil pra saber qual canal traz cara nova." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 px-2">Fonte</th>
                <th className="text-right py-2 px-2">Novos</th>
                <th className="text-right py-2 px-2">Recorrentes</th>
                <th className="text-right py-2 px-2">% Novos</th>
                <th className="text-right py-2 px-2">Sessões novas</th>
                <th className="text-right py-2 px-2">Logados</th>
                <th className="text-right py-2 px-2 text-emerald-400">Signups (novos)</th>
                <th className="text-right py-2 px-2 text-[#D9F564]">Leads (novos)</th>
              </tr>
            </thead>
            <tbody>
              {topSources.length === 0 && (
                <tr><td colSpan={8} className="text-center py-6 text-zinc-500">Sem dados ainda — começa a aparecer após as próximas visitas.</td></tr>
              )}
              {topSources.map((r, i) => {
                const tot = Number(r.new_visitors ?? 0) + Number(r.returning_visitors ?? 0);
                return (
                  <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                    <td className="py-2 px-2 text-zinc-200 truncate max-w-[200px]">{r.source ?? "—"}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-emerald-300">{fmt(r.new_visitors)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-blue-300">{fmt(r.returning_visitors)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-400">{pct(Number(r.new_visitors ?? 0), tot)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-300">{fmt(r.sessions_new)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-300">{fmt(r.authenticated_visitors)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-emerald-300">{fmt(r.signups_new)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-[#D9F564]">{fmt(r.leads_new)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function Row({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs text-zinc-300">{icon}{label}</div>
      <div className="text-right">
        <div className="text-lg font-semibold tabular-nums text-zinc-100">{value}</div>
        {sub && <div className="text-[10px] text-zinc-500">{sub}</div>}
      </div>
    </div>
  );
}
