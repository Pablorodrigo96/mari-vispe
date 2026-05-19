import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, BarChart3, MapPin, Trophy, Loader2, Upload, ExternalLink, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVertical } from "@/hooks/useVerticalRegistry";

const UFS = ["", "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

interface UfRow {
  vertical_slug: string;
  uf: string;
  n_companies: number;
  n_cities: number;
  metric_1_sum: number | null;
  metric_1_avg: number | null;
  n_promoted: number;
  last_data_corte: string | null;
}

interface CompanyRow {
  id: string;
  vertical_slug: string;
  cnpj: string;
  razao_social: string | null;
  uf: string | null;
  municipio: string | null;
  cnae: string | null;
  category: string | null;
  metric_1: number | null;
  metric_2: number | null;
  data_corte: string | null;
  source_url: string | null;
  promoted: boolean;
  rank_uf: number;
  rank_global: number;
}

function fmtNum(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export default function VerticalMarketPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: vertical, isLoading: loadingVertical, error: verticalError } = useVertical(slug);

  const [ufFilter, setUfFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [ufRows, setUfRows] = useState<UfRow[]>([]);
  const [topCompanies, setTopCompanies] = useState<CompanyRow[]>([]);
  const [promoting, setPromoting] = useState<string | null>(null);

  // Hard redirect to ISP page if it has dedicated market_page_path
  if (vertical?.market_page_path && vertical.market_page_path !== `/equity-brain/vertical/${slug}/mercado`) {
    return <Navigate to={vertical.market_page_path} replace />;
  }

  async function refresh() {
    if (!slug) return;
    setLoading(true);
    try {
      let ufQ = supabase
        .from("eb_vertical_uf_summary" as any)
        .select("*")
        .eq("vertical_slug", slug)
        .order("metric_1_sum", { ascending: false, nullsFirst: false });
      if (ufFilter) ufQ = ufQ.eq("uf", ufFilter);

      let coQ = supabase
        .from("eb_vertical_company_stats" as any)
        .select("*")
        .eq("vertical_slug", slug)
        .order("metric_1", { ascending: false, nullsFirst: false })
        .limit(60);
      if (ufFilter) coQ = coQ.eq("uf", ufFilter);

      const [ufRes, coRes] = await Promise.all([ufQ, coQ]);
      if (ufRes.error) throw ufRes.error;
      if (coRes.error) throw coRes.error;
      setUfRows((ufRes.data ?? []) as any);
      setTopCompanies((coRes.data ?? []) as any);
    } catch (e: any) {
      toast.error("Falha ao carregar mercado", { description: e?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, [slug, ufFilter]);

  async function promote(importId: string) {
    setPromoting(importId);
    try {
      const { error } = await supabase.rpc("fn_promote_vertical_lead" as any, { p_import_id: importId });
      if (error) throw error;
      toast.success("Lead promovido para o CRM");
      await refresh();
    } catch (e: any) {
      toast.error("Falha ao promover", { description: e?.message });
    } finally {
      setPromoting(null);
    }
  }

  const kpis = useMemo(() => {
    const totCo = ufRows.reduce((a, r) => a + Number(r.n_companies ?? 0), 0);
    const totCi = ufRows.reduce((a, r) => a + Number(r.n_cities ?? 0), 0);
    const totM1 = ufRows.reduce((a, r) => a + Number(r.metric_1_sum ?? 0), 0);
    const totProm = ufRows.reduce((a, r) => a + Number(r.n_promoted ?? 0), 0);
    return { totCo, totCi, totM1, totProm };
  }, [ufRows]);

  if (loadingVertical) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center text-xs"><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando vertical…</div>;
  }
  if (verticalError || !vertical) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-300 p-6">
        <Link to="/equity-brain/hoje" className="text-xs text-zinc-500 hover:text-zinc-200 inline-flex items-center gap-1"><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Link>
        <div className="mt-6 max-w-md mx-auto text-center">
          <h1 className="text-lg font-bold">Vertical não encontrada</h1>
          <p className="text-sm text-zinc-500 mt-2">A vertical <code className="font-mono text-zinc-300">{slug}</code> não está cadastrada ou está inativa.</p>
        </div>
      </div>
    );
  }

  const m1 = vertical.metric_1_label ?? "Métrica";
  const m1u = vertical.metric_1_unit ?? "";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/equity-brain/hoje" className="text-zinc-500 hover:text-zinc-200 inline-flex items-center gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <h1 className="text-base font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            Mercado · {vertical.label}
          </h1>
          {vertical.source_name && (
            <span className="text-[10px] text-zinc-500">
              Fonte: {vertical.source_url ? <a href={vertical.source_url} target="_blank" rel="noreferrer" className="hover:text-emerald-300 inline-flex items-center gap-0.5">{vertical.source_name} <ExternalLink className="h-2.5 w-2.5" /></a> : vertical.source_name}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Select value={ufFilter || "all"} onValueChange={(v) => setUfFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[100px] h-8 text-xs bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 max-h-[300px]">
                <SelectItem value="all">Todas UFs</SelectItem>
                {UFS.filter(Boolean).map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            <Link to={`/equity-brain/vertical/${slug}/import`}>
              <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-emerald-300">
                <Upload className="h-3 w-3 mr-1" /> Importar dados
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {vertical.short_description && (
          <p className="text-xs text-zinc-500 max-w-3xl break-words">{vertical.short_description}</p>
        )}

        {loading && (
          <div className="text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
          </div>
        )}

        {!loading && ufRows.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-8 text-center">
            <p className="text-sm text-zinc-300">Vertical configurada, mas sem dados ainda.</p>
            <p className="text-xs text-zinc-500 mt-1">Suba um CSV ou XLSX para começar a popular o mercado.</p>
            <Link to={`/equity-brain/vertical/${slug}/import`}>
              <Button size="sm" className="mt-4 bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90"><Upload className="h-3 w-3 mr-1" /> Importar dados</Button>
            </Link>
          </div>
        )}

        {ufRows.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Kpi label="Empresas" value={fmtNum(kpis.totCo)} hint={ufFilter || "Brasil"} />
              <Kpi label="Cidades" value={fmtNum(kpis.totCi)} hint="cobertas" />
              <Kpi label={`${m1} (Σ)`} value={fmtNum(kpis.totM1)} hint={m1u} accent="emerald" />
              <Kpi label="Promovidas ao CRM" value={fmtNum(kpis.totProm)} hint="leads ativos" accent="volt" />
            </div>

            <Card title="Resumo por UF" Icon={MapPin}>
              <div className="overflow-auto max-h-[420px]">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-950 text-zinc-500 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">UF</th>
                      <th className="text-right px-3 py-2 font-medium">Empresas</th>
                      <th className="text-right px-3 py-2 font-medium">Cidades</th>
                      <th className="text-right px-3 py-2 font-medium">{m1} (Σ)</th>
                      <th className="text-right px-3 py-2 font-medium">{m1} (média)</th>
                      <th className="text-right px-3 py-2 font-medium">Promovidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {ufRows.map((r) => (
                      <tr key={r.uf} className="hover:bg-zinc-800/40">
                        <td className="px-3 py-2 font-mono text-zinc-100">{r.uf}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-300">{fmtNum(r.n_companies)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{fmtNum(r.n_cities)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-300 font-semibold">{fmtNum(r.metric_1_sum)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{fmtNum(r.metric_1_avg)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-[#D9F564]">{fmtNum(r.n_promoted)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title={`Top empresas por ${m1}`} Icon={Trophy}>
              <div className="overflow-auto max-h-[520px]">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-950 text-zinc-500 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">#</th>
                      <th className="text-left px-3 py-2 font-medium">Empresa</th>
                      <th className="text-left px-3 py-2 font-medium">UF · Cidade</th>
                      <th className="text-right px-3 py-2 font-medium">{m1}</th>
                      <th className="text-center px-3 py-2 font-medium">Status</th>
                      <th className="text-center px-3 py-2 font-medium">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {topCompanies.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-800/40">
                        <td className="px-3 py-2 tabular-nums text-zinc-500">{c.rank_global}</td>
                        <td className="px-3 py-2 text-zinc-100 break-words max-w-[280px]">
                          <div className="font-medium">{c.razao_social ?? "—"}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{c.cnpj}</div>
                        </td>
                        <td className="px-3 py-2 text-zinc-400 break-words max-w-[200px]">
                          <span className="font-mono">{c.uf ?? "—"}</span>
                          {c.municipio && <span className="text-zinc-500"> · {c.municipio}</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-300 font-semibold">{fmtNum(c.metric_1)}</td>
                        <td className="px-3 py-2 text-center">
                          {c.promoted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#D9F564]"><CheckCircle2 className="h-3 w-3" /> CRM</span>
                          ) : (
                            <span className="text-[10px] text-zinc-500">Lead frio</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {!c.promoted && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={promoting === c.id}
                              onClick={() => promote(c.id)}
                              className="h-6 text-[10px] bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-emerald-300"
                            >
                              {promoting === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Promover"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: "emerald" | "volt" | "zinc" }) {
  const color = accent === "emerald" ? "text-emerald-300" : accent === "volt" ? "text-[#D9F564]" : "text-zinc-100";
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 backdrop-blur-md p-4">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`text-2xl font-bold tabular-nums mt-1 ${color}`}>{value}</div>
      {hint && <div className="text-[10px] text-zinc-500 mt-0.5">{hint}</div>}
    </div>
  );
}

function Card({ title, Icon, children }: { title: string; Icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 backdrop-blur-md overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-200">{title}</span>
      </div>
      {children}
    </div>
  );
}
