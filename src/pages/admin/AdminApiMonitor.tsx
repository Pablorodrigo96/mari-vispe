import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatsCard } from "@/components/admin/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, AlertTriangle, DollarSign, Gauge, Zap } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Period = "24h" | "7d" | "30d" | "90d";
const PERIOD_DAYS: Record<Period, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
const COLORS = ["#D9F564", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#EC4899", "#06B6D4"];

interface UsageRow {
  day: string;
  provider: string;
  category: string;
  model: string | null;
  function_name: string | null;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  cost_brl: number;
  avg_latency_ms: number | null;
  errors: number;
  error_rate_pct: number | null;
}

interface PricingRow {
  id: string;
  provider: string;
  model: string;
  category: string;
  input_per_1m_usd: number;
  output_per_1m_usd: number;
  flat_per_call_usd: number;
}

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const AdminApiMonitor = () => {
  const [period, setPeriod] = useState<Period>("30d");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [usdRate, setUsdRate] = useState<string>("5.20");
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - PERIOD_DAYS[period] * 24 * 3600 * 1000).toISOString();
    const [usageR, priceR, settingsR, recentR] = await Promise.all([
      (supabase as any).from("api_usage_daily_summary").select("*").gte("day", since),
      supabase.from("api_pricing" as any).select("*").order("provider"),
      supabase.from("api_settings" as any).select("*").eq("key", "usd_brl_rate").maybeSingle(),
      supabase.from("api_usage_logs" as any).select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (usageR.data) setUsage(usageR.data as any as UsageRow[]);
    if (priceR.data) setPricing(priceR.data as any as PricingRow[]);
    if ((settingsR.data as any)?.value) setUsdRate((settingsR.data as any).value);
    if (recentR.data) setRecent(recentR.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [period]);

  const filtered = useMemo(() => {
    return providerFilter === "all" ? usage : usage.filter((r) => r.provider === providerFilter);
  }, [usage, providerFilter]);

  const kpis = useMemo(() => {
    const totalBrl = filtered.reduce((s, r) => s + Number(r.cost_brl ?? 0), 0);
    const totalCalls = filtered.reduce((s, r) => s + Number(r.calls ?? 0), 0);
    const totalTokens = filtered.reduce((s, r) => s + Number(r.total_tokens ?? 0), 0);
    const totalErrors = filtered.reduce((s, r) => s + Number(r.errors ?? 0), 0);
    const errRate = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0;
    const latencies = filtered.map((r) => Number(r.avg_latency_ms ?? 0)).filter((n) => n > 0);
    const avgLat = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    return { totalBrl, totalCalls, totalTokens, errRate, avgLat };
  }, [filtered]);

  const dailyChart = useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    filtered.forEach((r) => {
      const k = r.day;
      if (!map.has(k)) map.set(k, { day: k });
      const row = map.get(k)!;
      row[r.provider] = (row[r.provider] ?? 0) + Number(r.cost_brl ?? 0);
    });
    return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [filtered]);

  const providers = useMemo(() => Array.from(new Set(usage.map((r) => r.provider))), [usage]);

  const topFunctions = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const k = r.function_name ?? "(unknown)";
      map.set(k, (map.get(k) ?? 0) + Number(r.cost_brl ?? 0));
    });
    return Array.from(map.entries())
      .map(([function_name, cost_brl]) => ({ function_name, cost_brl }))
      .sort((a, b) => b.cost_brl - a.cost_brl).slice(0, 10);
  }, [filtered]);

  const categoryShare = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      map.set(r.category, (map.get(r.category) ?? 0) + Number(r.cost_brl ?? 0));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const tableRows = useMemo(() => {
    const map = new Map<string, any>();
    filtered.forEach((r) => {
      const k = `${r.provider}::${r.model}::${r.function_name}`;
      if (!map.has(k)) {
        map.set(k, {
          provider: r.provider, model: r.model, function_name: r.function_name,
          calls: 0, input_tokens: 0, output_tokens: 0, cost_brl: 0, latencies: [], errors: 0,
        });
      }
      const row = map.get(k);
      row.calls += Number(r.calls ?? 0);
      row.input_tokens += Number(r.input_tokens ?? 0);
      row.output_tokens += Number(r.output_tokens ?? 0);
      row.cost_brl += Number(r.cost_brl ?? 0);
      row.errors += Number(r.errors ?? 0);
      if (r.avg_latency_ms) row.latencies.push(Number(r.avg_latency_ms));
    });
    return Array.from(map.values())
      .map((r) => ({
        ...r,
        avg_latency_ms: r.latencies.length ? r.latencies.reduce((a: number, b: number) => a + b, 0) / r.latencies.length : 0,
        error_rate_pct: r.calls ? (r.errors / r.calls) * 100 : 0,
      }))
      .sort((a, b) => b.cost_brl - a.cost_brl);
  }, [filtered]);

  async function savePricing(row: PricingRow) {
    const { error } = await supabase
      .from("api_pricing" as any)
      .update({
        input_per_1m_usd: Number(row.input_per_1m_usd),
        output_per_1m_usd: Number(row.output_per_1m_usd),
        flat_per_call_usd: Number(row.flat_per_call_usd),
      })
      .eq("id", row.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Preço atualizado" });
  }

  async function saveRate() {
    const { error } = await supabase
      .from("api_settings" as any)
      .upsert({ key: "usd_brl_rate", value: usdRate });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Câmbio atualizado para R$ " + usdRate });
  }

  function exportCSV() {
    const header = ["provider", "model", "function_name", "calls", "input_tokens", "output_tokens", "cost_brl", "avg_latency_ms", "error_rate_pct"];
    const lines = [header.join(",")];
    tableRows.forEach((r) => lines.push(header.map((h) => String(r[h] ?? "")).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `api-usage-${period}.csv`; a.click();
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" /> Monitor de APIs &amp; IA
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Uso, latência e custo (R$) de Lovable AI, Anthropic, Perplexity, Stripe e demais integrações.
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Últimas 24h</SelectItem>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="90d">90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Provider" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos providers</SelectItem>
                {providers.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load}>Atualizar</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard title="Custo total" value={fmtBRL(kpis.totalBrl)} icon={DollarSign} />
          <StatsCard title="Chamadas" value={kpis.totalCalls.toLocaleString("pt-BR")} icon={Activity} />
          <StatsCard title="Tokens" value={kpis.totalTokens.toLocaleString("pt-BR")} icon={Zap} />
          <StatsCard title="Taxa de erro" value={`${kpis.errRate.toFixed(1)}%`} icon={AlertTriangle} />
          <StatsCard title="Latência média" value={`${Math.round(kpis.avgLat)} ms`} icon={Gauge} />
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="breakdown">Detalhado</TabsTrigger>
            <TabsTrigger value="pricing">Preços</TabsTrigger>
            <TabsTrigger value="recent">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle>Custo diário por provider (R$)</CardTitle></CardHeader>
              <CardContent style={{ height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={dailyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                    <Legend />
                    {providers.map((p, i) => (
                      <Line key={p} type="monotone" dataKey={p} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Top 10 funções por custo</CardTitle></CardHeader>
                <CardContent style={{ height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={topFunctions} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis type="category" dataKey="function_name" width={140} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                      <Bar dataKey="cost_brl" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Custo por categoria</CardTitle></CardHeader>
                <CardContent style={{ height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={categoryShare} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {categoryShare.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="breakdown" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detalhamento por provider · modelo · função</CardTitle>
                <Button variant="outline" size="sm" onClick={exportCSV}>Exportar CSV</Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead className="text-right">Chamadas</TableHead>
                        <TableHead className="text-right">Tokens in</TableHead>
                        <TableHead className="text-right">Tokens out</TableHead>
                        <TableHead className="text-right">Custo R$</TableHead>
                        <TableHead className="text-right">Latência (ms)</TableHead>
                        <TableHead className="text-right">Erro %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell><Badge variant="outline">{r.provider}</Badge></TableCell>
                          <TableCell className="text-xs">{r.model ?? "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{r.function_name ?? "—"}</TableCell>
                          <TableCell className="text-right">{r.calls.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right">{r.input_tokens.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right">{r.output_tokens.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right font-semibold">{fmtBRL(r.cost_brl)}</TableCell>
                          <TableCell className="text-right">{Math.round(r.avg_latency_ms)}</TableCell>
                          <TableCell className="text-right">
                            {r.error_rate_pct > 5 ? <Badge variant="destructive">{r.error_rate_pct.toFixed(1)}%</Badge> : `${r.error_rate_pct.toFixed(1)}%`}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!tableRows.length && (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          {loading ? "Carregando..." : "Sem dados no período. Os logs começam a popular conforme as funções forem chamadas."}
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle>Câmbio USD → BRL</CardTitle></CardHeader>
              <CardContent className="flex items-end gap-3">
                <div className="flex-1 max-w-xs">
                  <label className="text-xs text-muted-foreground">Taxa de câmbio</label>
                  <Input type="number" step="0.01" value={usdRate} onChange={(e) => setUsdRate(e.target.value)} />
                </div>
                <Button onClick={saveRate}>Salvar</Button>
                <p className="text-xs text-muted-foreground ml-2">Aplicado a todos novos cálculos. Não reescreve histórico.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Preços por provider/modelo (USD)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Input / 1M</TableHead>
                        <TableHead>Output / 1M</TableHead>
                        <TableHead>Flat / chamada</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricing.map((p, idx) => (
                        <TableRow key={p.id}>
                          <TableCell><Badge variant="outline">{p.provider}</Badge></TableCell>
                          <TableCell className="text-xs">{p.model}</TableCell>
                          <TableCell className="text-xs">{p.category}</TableCell>
                          <TableCell>
                            <Input type="number" step="0.001" defaultValue={p.input_per_1m_usd}
                              onChange={(e) => (pricing[idx].input_per_1m_usd = Number(e.target.value))}
                              className="w-24" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.001" defaultValue={p.output_per_1m_usd}
                              onChange={(e) => (pricing[idx].output_per_1m_usd = Number(e.target.value))}
                              className="w-24" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.0001" defaultValue={p.flat_per_call_usd}
                              onChange={(e) => (pricing[idx].flat_per_call_usd = Number(e.target.value))}
                              className="w-24" />
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => savePricing(pricing[idx])}>Salvar</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Últimas 100 chamadas</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quando</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">R$</TableHead>
                        <TableHead className="text-right">Latência</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recent.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                          <TableCell><Badge variant="outline">{r.provider}</Badge></TableCell>
                          <TableCell className="text-xs">{r.model ?? "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{r.function_name ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs">{(r.total_tokens ?? 0).toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right">{fmtBRL(Number(r.cost_brl ?? 0))}</TableCell>
                          <TableCell className="text-right text-xs">{r.latency_ms ?? "—"}</TableCell>
                          <TableCell>
                            {r.status === "success"
                              ? <Badge variant="default">ok</Badge>
                              : <Badge variant="destructive">{r.status}</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!recent.length && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhuma chamada registrada ainda.
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminApiMonitor;
