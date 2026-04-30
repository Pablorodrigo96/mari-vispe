import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, MapPin, Trophy, Waves, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface CityStat {
  ibge_code: string | null;
  municipio: string | null;
  uf: string | null;
  period_ref: string;
  total_accesses: number | null;
  n_providers: number | null;
  leader_cnpj: string | null;
  leader_share: number | null;
  hhi: number | null;
  fragmentation_score: number | null;
  rollup_opportunity_score: number | null;
}

interface CompanyStat {
  cnpj: string;
  provider_name_norm: string | null;
  total_accesses: number | null;
  n_municipios: number | null;
  n_ufs: number | null;
  rollup_target_score: number | null;
  local_leader_score: number | null;
  sellability_score: number | null;
  platform_potential_score: number | null;
  best_thesis_key: string | null;
  best_thesis_score: number | null;
}

interface UfRow {
  uf: string;
  period_ref: string;
  total_accesses: number;
  n_providers_sum: number;
  avg_fragmentation: number;
  avg_rollup_opportunity: number;
  n_cities: number;
}

const UFS = ["", "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function fmtNum(n: number | null | undefined, digits = 0) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtPct(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `${(Number(n) * 100).toFixed(1)}%`;
}
function scoreColor(n: number | null | undefined) {
  const v = Number(n ?? 0);
  if (v >= 0.75) return "text-emerald-300";
  if (v >= 0.5) return "text-amber-300";
  if (v >= 0.25) return "text-orange-300";
  return "text-zinc-400";
}

export default function IspMarketPage() {
  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState<string>("");
  const [ufFilter, setUfFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [ufRows, setUfRows] = useState<UfRow[]>([]);
  const [topCities, setTopCities] = useState<CityStat[]>([]);
  const [topRollupTargets, setTopRollupTargets] = useState<CompanyStat[]>([]);
  const [topLeaders, setTopLeaders] = useState<CompanyStat[]>([]);

  // Load periods on mount
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("eb_isp_city_stats" as any)
        .select("period_ref")
        .order("period_ref", { ascending: false })
        .limit(500);
      if (error) {
        toast.error("Falha ao carregar períodos", { description: error.message });
        return;
      }
      const uniq = Array.from(new Set((data ?? []).map((r: any) => r.period_ref))).sort().reverse();
      setPeriods(uniq);
      if (uniq.length > 0) setPeriod(uniq[0]);
    })();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (!period) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, ufFilter]);

  async function refresh() {
    setLoading(true);
    try {
      // 1) UF summary
      let ufQ = supabase
        .from("eb_isp_uf_summary" as any)
        .select("*")
        .eq("period_ref", period)
        .order("avg_rollup_opportunity", { ascending: false });
      if (ufFilter) ufQ = ufQ.eq("uf", ufFilter);

      // 2) Top cidades fragmentadas
      let cityQ = supabase
        .from("eb_isp_city_stats" as any)
        .select("ibge_code, municipio, uf, period_ref, total_accesses, n_providers, leader_cnpj, leader_share, hhi, fragmentation_score, rollup_opportunity_score")
        .eq("period_ref", period)
        .order("rollup_opportunity_score", { ascending: false, nullsFirst: false })
        .limit(40);
      if (ufFilter) cityQ = cityQ.eq("uf", ufFilter);

      // 3) Top rollup targets
      let rollQ = supabase
        .from("eb_isp_company_stats" as any)
        .select("cnpj, provider_name_norm, total_accesses, n_municipios, n_ufs, rollup_target_score, local_leader_score, sellability_score, platform_potential_score, best_thesis_key, best_thesis_score")
        .eq("period_ref", period)
        .order("rollup_target_score", { ascending: false, nullsFirst: false })
        .limit(30);

      // 4) Top líderes locais
      let ledQ = supabase
        .from("eb_isp_company_stats" as any)
        .select("cnpj, provider_name_norm, total_accesses, n_municipios, n_ufs, rollup_target_score, local_leader_score, sellability_score, platform_potential_score, best_thesis_key, best_thesis_score")
        .eq("period_ref", period)
        .order("local_leader_score", { ascending: false, nullsFirst: false })
        .limit(30);

      const [ufRes, cityRes, rollRes, ledRes] = await Promise.all([ufQ, cityQ, rollQ, ledQ]);
      if (ufRes.error)   throw ufRes.error;
      if (cityRes.error) throw cityRes.error;
      if (rollRes.error) throw rollRes.error;
      if (ledRes.error)  throw ledRes.error;

      setUfRows((ufRes.data ?? []) as any);
      setTopCities((cityRes.data ?? []) as any);
      setTopRollupTargets((rollRes.data ?? []) as any);
      setTopLeaders((ledRes.data ?? []) as any);
    } catch (e: any) {
      toast.error("Falha ao carregar dados de mercado", { description: e?.message });
    } finally {
      setLoading(false);
    }
  }

  const kpis = useMemo(() => {
    const tot = ufRows.reduce((a, r) => a + Number(r.total_accesses ?? 0), 0);
    const cit = ufRows.reduce((a, r) => a + Number(r.n_cities ?? 0), 0);
    const avgFrag = ufRows.length > 0
      ? ufRows.reduce((a, r) => a + Number(r.avg_fragmentation ?? 0), 0) / ufRows.length
      : 0;
    const avgRoll = ufRows.length > 0
      ? ufRows.reduce((a, r) => a + Number(r.avg_rollup_opportunity ?? 0), 0) / ufRows.length
      : 0;
    return { tot, cit, avgFrag, avgRoll };
  }, [ufRows]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/equity-brain/isp/import" className="text-zinc-500 hover:text-zinc-200 inline-flex items-center gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <h1 className="text-base font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            Mercado ISP — Inteligência de Banda Larga Fixa
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px] h-8 text-xs bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800">
                {periods.length === 0 && <SelectItem value="none" disabled>Sem dados</SelectItem>}
                {periods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ufFilter || "all"} onValueChange={(v) => setUfFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[100px] h-8 text-xs bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 max-h-[300px]">
                <SelectItem value="all">Todas UFs</SelectItem>
                {UFS.filter(Boolean).map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            <Link to="/equity-brain/isp/sugestoes">
              <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-emerald-300">
                <Sparkles className="h-3 w-3 mr-1" /> Sugestões frias
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {loading && (
          <div className="text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando dados de mercado…
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Acessos totais" value={fmtNum(kpis.tot)} hint={ufFilter || "Brasil"} accent="emerald" />
          <Kpi label="Cidades cobertas" value={fmtNum(kpis.cit)} hint={`período ${period || "—"}`} accent="zinc" />
          <Kpi label="Fragmentação média" value={(kpis.avgFrag).toFixed(2)} hint="0=monopólio · 1=pulverizado" accent="amber" />
          <Kpi label="Oport. roll-up média" value={(kpis.avgRoll).toFixed(2)} hint="score combinado tamanho × fragmentação" accent="blue" />
        </div>

        {/* UF heatmap */}
        <Card title="Onda regional por UF" Icon={Waves}>
          <div className="overflow-auto max-h-[420px]">
            <table className="w-full text-xs">
              <thead className="bg-zinc-950 text-zinc-500 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">UF</th>
                  <th className="text-right px-3 py-2 font-medium">Cidades</th>
                  <th className="text-right px-3 py-2 font-medium">Acessos</th>
                  <th className="text-right px-3 py-2 font-medium">Provedores·Σ</th>
                  <th className="text-right px-3 py-2 font-medium">Frag. média</th>
                  <th className="text-right px-3 py-2 font-medium">Oport. roll-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {ufRows.map((r) => (
                  <tr key={r.uf} className="hover:bg-zinc-800/40">
                    <td className="px-3 py-2 font-mono text-zinc-100">{r.uf}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-300">{fmtNum(r.n_cities)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-300">{fmtNum(r.total_accesses)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{fmtNum(r.n_providers_sum)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${scoreColor(r.avg_fragmentation)}`}>{Number(r.avg_fragmentation ?? 0).toFixed(2)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${scoreColor(r.avg_rollup_opportunity)}`}>{Number(r.avg_rollup_opportunity ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
                {ufRows.length === 0 && !loading && (
                  <tr><td colSpan={6} className="text-center px-3 py-8 text-zinc-500">Sem dados para esse período/UF.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top cidades fragmentadas */}
          <Card title="Cidades com maior oportunidade de consolidação" Icon={MapPin}>
            <div className="overflow-auto max-h-[420px]">
              <table className="w-full text-xs">
                <thead className="bg-zinc-950 text-zinc-500 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Cidade</th>
                    <th className="text-right px-3 py-2 font-medium">Provedores</th>
                    <th className="text-right px-3 py-2 font-medium">Acessos</th>
                    <th className="text-right px-3 py-2 font-medium">Líder %</th>
                    <th className="text-right px-3 py-2 font-medium">HHI</th>
                    <th className="text-right px-3 py-2 font-medium">Roll-up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {topCities.map((c) => (
                    <tr key={c.ibge_code ?? `${c.uf}-${c.municipio}`} className="hover:bg-zinc-800/40">
                      <td className="px-3 py-2 text-zinc-100 break-words max-w-[200px]">
                        <span className="font-medium">{c.municipio}</span>
                        <span className="text-zinc-500"> · {c.uf}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-300">{fmtNum(c.n_providers)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-300">{fmtNum(c.total_accesses)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{fmtPct(c.leader_share)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{Number(c.hhi ?? 0).toFixed(2)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${scoreColor(c.rollup_opportunity_score)}`}>{Number(c.rollup_opportunity_score ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {topCities.length === 0 && !loading && (
                    <tr><td colSpan={6} className="text-center px-3 py-8 text-zinc-500">Sem cidades para exibir.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Top rollup targets */}
          <Card title="Top alvos para roll-up (subscale + fragmentação)" Icon={Trophy}>
            <div className="overflow-auto max-h-[420px]">
              <table className="w-full text-xs">
                <thead className="bg-zinc-950 text-zinc-500 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Provedor</th>
                    <th className="text-right px-3 py-2 font-medium">Acessos</th>
                    <th className="text-right px-3 py-2 font-medium">Cidades</th>
                    <th className="text-right px-3 py-2 font-medium">Roll-up</th>
                    <th className="text-right px-3 py-2 font-medium">Sellability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {topRollupTargets.map((r) => (
                    <tr key={r.cnpj} className="hover:bg-zinc-800/40">
                      <td className="px-3 py-2 text-zinc-100 break-words max-w-[260px]">
                        <div className="font-medium">{r.provider_name_norm ?? "—"}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{r.cnpj}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-300">{fmtNum(r.total_accesses)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{fmtNum(r.n_municipios)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${scoreColor(r.rollup_target_score)}`}>{Number(r.rollup_target_score ?? 0).toFixed(2)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${scoreColor(r.sellability_score)}`}>{Number(r.sellability_score ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {topRollupTargets.length === 0 && !loading && (
                    <tr><td colSpan={5} className="text-center px-3 py-8 text-zinc-500">Sem provedores.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Top líderes locais */}
          <Card title="Líderes locais (plataformas de consolidação)" Icon={Trophy}>
            <div className="overflow-auto max-h-[420px]">
              <table className="w-full text-xs">
                <thead className="bg-zinc-950 text-zinc-500 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Provedor</th>
                    <th className="text-right px-3 py-2 font-medium">Acessos</th>
                    <th className="text-right px-3 py-2 font-medium">Cidades</th>
                    <th className="text-right px-3 py-2 font-medium">UFs</th>
                    <th className="text-right px-3 py-2 font-medium">Líder local</th>
                    <th className="text-right px-3 py-2 font-medium">Plataforma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {topLeaders.map((r) => (
                    <tr key={r.cnpj} className="hover:bg-zinc-800/40">
                      <td className="px-3 py-2 text-zinc-100 break-words max-w-[260px]">
                        <div className="font-medium">{r.provider_name_norm ?? "—"}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{r.cnpj}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-300">{fmtNum(r.total_accesses)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{fmtNum(r.n_municipios)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{fmtNum(r.n_ufs)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${scoreColor(r.local_leader_score)}`}>{Number(r.local_leader_score ?? 0).toFixed(2)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${scoreColor(r.platform_potential_score)}`}>{Number(r.platform_potential_score ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {topLeaders.length === 0 && !loading && (
                    <tr><td colSpan={6} className="text-center px-3 py-8 text-zinc-500">Sem líderes para exibir.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Glossário */}
          <Card title="Como ler estes scores" Icon={BarChart3}>
            <div className="text-xs text-zinc-400 space-y-2 px-4 py-3">
              <p><span className="text-zinc-200 font-semibold">Fragmentação</span> · 1 − HHI. Próximo de 1 = mercado pulverizado, ideal para teses de consolidação.</p>
              <p><span className="text-zinc-200 font-semibold">Oportunidade de roll-up</span> · combina fragmentação com tamanho do mercado. Cidades grandes e fragmentadas pontuam alto.</p>
              <p><span className="text-zinc-200 font-semibold">Roll-up target</span> · provedor pequeno, exposto a mercados fragmentados, sem liderança local — alvo natural de aquisição.</p>
              <p><span className="text-zinc-200 font-semibold">Líder local</span> · concentra share elevado em poucas cidades — boa plataforma compradora.</p>
              <p><span className="text-zinc-200 font-semibold">Sellability</span> · proxy de prontidão de venda (idade, escala, sucessão).</p>
              <p className="pt-2 text-zinc-500 italic">Esta tela é puramente analítica e não cria registros no CRM. Para promover um provedor, use a tela de <Link to="/equity-brain/isp/sugestoes" className="underline text-emerald-300">sugestões frias</Link>.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint: string; accent: "emerald" | "zinc" | "amber" | "blue" }) {
  const accents: Record<string, string> = {
    emerald: "text-emerald-300",
    zinc: "text-zinc-200",
    amber: "text-amber-300",
    blue: "text-sky-300",
  };
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 backdrop-blur-md p-4">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`text-2xl font-bold tabular-nums mt-1 ${accents[accent]}`}>{value}</div>
      <div className="text-[10px] text-zinc-500 mt-1">{hint}</div>
    </div>
  );
}

function Card({ title, Icon, children }: { title: string; Icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-emerald-400" />
        <h2 className="text-sm font-bold text-zinc-100">{title}</h2>
      </div>
      {children}
    </div>
  );
}
