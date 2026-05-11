import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { InfoHint } from "@/components/equity-brain/InfoHint";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { DollarSign, AlertTriangle, Power, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type DailyRow = {
  day: string;
  provider: string;
  calls: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  errors: number;
};

type TopFn = {
  function_name: string | null;
  calls: number;
  cost_usd: number;
  last_call: string;
};

const PROVIDERS = ["anthropic", "lovable_ai", "brasilapi", "nominatim", "meta_whatsapp"] as const;
type Provider = (typeof PROVIDERS)[number];

const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: "Anthropic",
  lovable_ai: "Lovable AI",
  brasilapi: "BrasilAPI",
  nominatim: "Nominatim",
  meta_whatsapp: "Meta WhatsApp",
};

const COLORS: Record<Provider, string> = {
  anthropic: "#f97316",
  lovable_ai: "#D9F564",
  brasilapi: "#60a5fa",
  nominatim: "#a78bfa",
  meta_whatsapp: "#34d399",
};

const fmtUsd = (n: number) => `$${n.toFixed(4)}`;
const fmtUsdShort = (n: number) => `$${n.toFixed(2)}`;
const fmtInt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
const fmtDay = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

export function ApiCostSection() {
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [topFns, setTopFns] = useState<TopFn[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const [{ data: d }, { data: s }, { data: logs }] = await Promise.all([
      supabase
        .from("api_usage_daily_by_provider" as any)
        .select("*")
        .gte("day", since)
        .order("day"),
      supabase.from("api_settings").select("key,value"),
      supabase
        .from("api_usage_logs")
        .select("function_name, cost_usd, created_at")
        .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString())
        .limit(5000),
    ]);
    setDaily((d ?? []) as any);
    const map: Record<string, string> = {};
    (s ?? []).forEach((r: any) => {
      map[r.key] = r.value;
    });
    setSettings(map);

    // aggregate top functions client-side
    const agg = new Map<string, { calls: number; cost_usd: number; last_call: string }>();
    (logs ?? []).forEach((r: any) => {
      const k = r.function_name ?? "(unknown)";
      const cur = agg.get(k) ?? { calls: 0, cost_usd: 0, last_call: r.created_at };
      cur.calls += 1;
      cur.cost_usd += Number(r.cost_usd ?? 0);
      if (r.created_at > cur.last_call) cur.last_call = r.created_at;
      agg.set(k, cur);
    });
    setTopFns(
      Array.from(agg.entries())
        .map(([function_name, v]) => ({ function_name, ...v }))
        .sort((a, b) => b.cost_usd - a.cost_usd)
        .slice(0, 10),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Aggregate MTD per provider from daily (first day of current month)
  const mtd = useMemo(() => {
    const startMonth = new Date();
    startMonth.setUTCDate(1);
    startMonth.setUTCHours(0, 0, 0, 0);
    const startStr = startMonth.toISOString().slice(0, 10);
    const out: Record<string, { cost: number; calls: number; errors: number }> = {};
    for (const r of daily) {
      if (r.day < startStr) continue;
      const cur = out[r.provider] ?? { cost: 0, calls: 0, errors: 0 };
      cur.cost += Number(r.cost_usd ?? 0);
      cur.calls += Number(r.calls ?? 0);
      cur.errors += Number(r.errors ?? 0);
      out[r.provider] = cur;
    }
    return out;
  }, [daily]);

  // Wide series for chart
  const chartData = useMemo(() => {
    const byDay = new Map<string, any>();
    for (const r of daily) {
      const row = byDay.get(r.day) ?? { day: r.day };
      row[r.provider] = Number(r.cost_usd ?? 0);
      byDay.set(r.day, row);
    }
    return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [daily]);

  async function toggleProvider(provider: Provider, enabled: boolean) {
    setBusy(`toggle-${provider}`);
    const { error } = await supabase.rpc("set_provider_enabled" as any, {
      _provider: provider,
      _enabled: enabled,
    });
    setBusy(null);
    if (error) {
      toast.error(`Falha: ${error.message}`);
      return;
    }
    toast.success(`${PROVIDER_LABEL[provider]} ${enabled ? "ligado" : "desligado"}`);
    load();
  }

  async function setBudget(provider: Provider, usd: number) {
    setBusy(`budget-${provider}`);
    const { error } = await supabase.rpc("set_provider_budget" as any, {
      _provider: provider,
      _usd: usd,
    });
    setBusy(null);
    if (error) {
      toast.error(`Falha: ${error.message}`);
      return;
    }
    toast.success(`Orçamento ${PROVIDER_LABEL[provider]}: $${usd}`);
    load();
  }

  return (
    <Card className="p-4 !bg-slate-900/60 backdrop-blur-md border-zinc-800 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-[#D9F564]" />
          <h3 className="text-sm font-semibold">Custo de APIs externas (30d)</h3>
          <InfoHint text="Custo agregado por provider em api_usage_logs. Inclui kill switch e budget mensal para cortar fatura-surpresa." />
        </div>
        <Button size="sm" variant="outline" className="bg-transparent" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
      </div>

      {/* Provider control cards (focus on anthropic) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {PROVIDERS.map((p) => {
          const m = mtd[p] ?? { cost: 0, calls: 0, errors: 0 };
          const budget = Number(settings[`${p}_monthly_budget_usd`] ?? 0);
          const enabledStr = settings[`${p}_enabled`];
          const enabled = enabledStr !== "false";
          const pct = budget > 0 ? (m.cost / budget) * 100 : 0;
          const over = budget > 0 && m.cost >= budget;
          const warn = budget > 0 && !over && pct >= 80;
          return (
            <div
              key={p}
              className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: COLORS[p] }}
                  />
                  <span className="text-xs font-semibold">{PROVIDER_LABEL[p]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Power className="h-3 w-3 text-zinc-500" />
                  <Switch
                    checked={enabled}
                    disabled={busy === `toggle-${p}`}
                    onCheckedChange={(v) => toggleProvider(p, v)}
                  />
                </div>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-zinc-400">MTD</span>
                <span className="tabular-nums font-semibold">{fmtUsd(m.cost)}</span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-zinc-400">Calls / erros</span>
                <span className="tabular-nums">
                  {fmtInt(m.calls)} / <span className="text-red-400">{fmtInt(m.errors)}</span>
                </span>
              </div>
              {budget > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>vs orçamento</span>
                    <span className={over ? "text-red-400" : warn ? "text-amber-400" : "text-zinc-400"}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${over ? "bg-red-500" : warn ? "bg-amber-400" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  step={5}
                  defaultValue={budget || 0}
                  className="h-7 text-xs bg-zinc-900 border-zinc-800"
                  onBlur={(e) => {
                    const v = Number(e.currentTarget.value);
                    if (v !== budget && Number.isFinite(v)) setBudget(p, v);
                  }}
                />
                <span className="text-[10px] text-zinc-500">USD/mês</span>
              </div>
              {over && (
                <div className="flex items-center gap-1 text-[10px] text-red-400">
                  <AlertTriangle className="h-3 w-3" /> Acima do teto — chamadas bloqueadas
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Daily cost chart */}
      <div>
        <div className="text-xs font-semibold mb-2 text-zinc-300">Custo diário (USD)</div>
        <div className="h-56">
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickFormatter={fmtDay} />
              <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `$${Number(v).toFixed(2)}`} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", fontSize: 12 }}
                labelFormatter={fmtDay}
                formatter={(v: any) => fmtUsdShort(Number(v))}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {PROVIDERS.map((p) => (
                <Line
                  key={p}
                  type="monotone"
                  dataKey={p}
                  stroke={COLORS[p]}
                  name={PROVIDER_LABEL[p]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top functions */}
      <div>
        <div className="text-xs font-semibold mb-2 text-zinc-300">Top 10 funções por custo (30d)</div>
        <div className="overflow-auto max-h-72 rounded border border-zinc-800">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900 sticky top-0 text-zinc-400">
              <tr>
                <th className="px-3 py-2 text-left">Função</th>
                <th className="px-3 py-2 text-right">Calls</th>
                <th className="px-3 py-2 text-right">Custo USD</th>
                <th className="px-3 py-2 text-right">Última</th>
              </tr>
            </thead>
            <tbody>
              {topFns.map((r, i) => (
                <tr key={i} className="border-t border-zinc-800">
                  <td className="px-3 py-2 text-zinc-200 break-words">{r.function_name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtInt(r.calls)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#D9F564]">{fmtUsd(r.cost_usd)}</td>
                  <td className="px-3 py-2 text-right text-zinc-500">{fmtDay(r.last_call)}</td>
                </tr>
              ))}
              {!topFns.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                    Nenhuma chamada registrada nos últimos 30 dias.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
