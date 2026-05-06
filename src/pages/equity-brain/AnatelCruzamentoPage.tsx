import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Database, Building2, BarChart3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAnatelSchema, useAnatelByCnpj, useCrossRefRfbAnatel } from "@/hooks/useAnatelData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CompanyProfileCard } from "@/components/equity-brain/CompanyProfileCard";
import { CompanyFootprintTable } from "@/components/equity-brain/CompanyFootprintTable";
import { CompanyShareTable } from "@/components/equity-brain/CompanyShareTable";
import { AnatelFilterBar, type AnatelFilters } from "@/components/equity-brain/AnatelFilterBar";
import { formatNum, aggregateFromServer, type AnatelAggregate } from "@/lib/anatelInsights";

export default function AnatelCruzamentoPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [cnpj, setCnpj] = useState<string | null>(null);
  const [uf, setUf] = useState<string>("");
  const [cidade, setCidade] = useState<string>("");
  const [tab, setTab] = useState<"cnpj" | "share">("share");
  const [shareView, setShareView] = useState<"companies" | "cities">("companies");
  const schema = useAnatelSchema();

  const mainTable = schema.data?.tables?.find((t: any) =>
    /anatel|acessos|stel|provedor|broadband/i.test(t.table_name || ""),
  )?.table_name ?? schema.data?.tables?.[0]?.table_name ?? null;

  const cnpjCol = schema.data?.columns?.find(
    (c: any) => c.table_name === mainTable && /cnpj/i.test(c.column_name),
  )?.column_name;

  const byCnpj = useAnatelByCnpj(cnpj, mainTable, { cnpj_column: cnpjCol });
  const cross = useCrossRefRfbAnatel(cnpj, mainTable, cnpjCol);

  const [shareLoading, setShareLoading] = useState(false);
  const [shareByCity, setShareByCity] = useState<any[]>([]);
  const [companyRanking, setCompanyRanking] = useState<any[]>([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [footprint, setFootprint] = useState<any[]>([]);
  const [footprintLoading, setFootprintLoading] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<any | null>(null);
  const [companyProfileLoading, setCompanyProfileLoading] = useState(false);

  async function loadCompanyProfile(c: string) {
    if (!mainTable) return;
    setCompanyProfileLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("anatel-query", {
        body: { action: "stats", params: { table: mainTable, kind: "company_profile", cnpj: c } },
      });
      if (error) throw error;
      setCompanyProfile(data?.profile ?? null);
    } catch (e: any) {
      toast.error("Falha ao carregar perfil consolidado: " + (e?.message ?? "erro"));
      setCompanyProfile(null);
    } finally {
      setCompanyProfileLoading(false);
    }
  }

  async function loadCompanyRanking(filters?: { uf?: string; cidade?: string }) {
    if (!mainTable) return;
    setCompanyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("anatel-query", {
        body: {
          action: "stats",
          params: {
            table: mainTable,
            kind: "share_by_company",
            limit: 200,
            uf: filters?.uf || undefined,
            cidade: filters?.cidade || undefined,
          },
        },
      });
      if (error) throw error;
      setCompanyRanking(data?.rows ?? []);
    } catch (e: any) {
      toast.error("Falha ao carregar ranking de empresas: " + (e?.message ?? "erro"));
    } finally {
      setCompanyLoading(false);
    }
  }

  async function loadShare(filters?: { uf?: string; cidade?: string }) {
    if (!mainTable) return;
    setShareLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("anatel-query", {
        body: {
          action: "stats",
          params: {
            table: mainTable,
            kind: "share_by_municipio",
            limit: 200,
            uf: filters?.uf || undefined,
            cidade: filters?.cidade || undefined,
          },
        },
      });
      if (error) throw error;
      setShareByCity(data?.rows ?? []);
    } catch (e: any) {
      toast.error("Falha ao carregar market share por cidade: " + (e?.message ?? "erro"));
    } finally {
      setShareLoading(false);
    }
  }

  async function loadFootprint(c: string) {
    if (!mainTable) return;
    setFootprintLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("anatel-query", {
        body: {
          action: "stats",
          params: { table: mainTable, kind: "company_footprint", cnpj: c, limit: 500 },
        },
      });
      if (error) throw error;
      setFootprint(data?.rows ?? []);
    } catch (e: any) {
      toast.error("Falha ao carregar cidades da empresa: " + (e?.message ?? "erro"));
    } finally {
      setFootprintLoading(false);
    }
  }

  function handleSearch(f: AnatelFilters) {
    const c = f.selectedCnpj ?? (f.cnpj.length === 14 ? f.cnpj : null);
    setUf(f.uf);
    setCidade(f.cidade);
    if (c) {
      setCnpj(c);
      setTab("cnpj");
      loadFootprint(c);
    } else {
      setCnpj(null);
      setFootprint([]);
      setTab("share");
      loadCompanyRanking({ uf: f.uf, cidade: f.cidade });
      loadShare({ uf: f.uf, cidade: f.cidade });
    }
  }

  function handleClear() {
    setCnpj(null);
    setUf("");
    setCidade("");
    setFootprint([]);
    setShareByCity([]);
    setCompanyRanking([]);
    setTab("share");
  }

  function handleCompanyClick({ empresa, cnpj: c }: { empresa: string; cnpj: string }) {
    const clean = String(c).replace(/\D/g, "");
    if (clean.length !== 14) {
      toast.error(`CNPJ indisponível para ${empresa}`);
      return;
    }
    setCnpj(clean);
    setTab("cnpj");
    loadFootprint(clean);
  }

  const hasCompany = !!cnpj;
  const hasGeoFilter = !!(uf || cidade);
  const scopeLabel = cidade ? `${cidade}${uf ? ` / ${uf}` : ""}` : uf || "Brasil";
  const totalGeo = companyRanking[0]?.total_geo ? Number(companyRanking[0].total_geo) : null;
  const nEmpresas = companyRanking[0]?.n_empresas ? Number(companyRanking[0].n_empresas) : null;

  const content = (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-7xl px-6 py-8 space-y-4"}>
      {!embedded && (
        <div>
          <Link to="/equity-brain/hoje" className="text-zinc-500 hover:text-zinc-200 inline-flex items-center gap-1 text-xs">
            <ArrowLeft className="h-3 w-3" /> voltar
          </Link>
          <h1 className="text-2xl font-semibold mt-2 flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-400" />
            Cruzamento RFB × Anatel
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Inteligência de mercado M&A para ISPs — perfil consolidado, expansão geográfica e índice de regionalização.
          </p>
        </div>
      )}

      {schema.isLoading && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> conectando à base Anatel…
        </div>
      )}
      {schema.error && (
        <Card className="p-4 bg-red-950/30 border-red-900 text-sm text-red-200">
          Erro ao conectar: {(schema.error as any)?.message}
        </Card>
      )}

      <AnatelFilterBar
        table={mainTable}
        onSearch={handleSearch}
        onClear={handleClear}
        loading={shareLoading || footprintLoading || cross.isLoading || byCnpj.isLoading || companyLoading}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="cnpj" disabled={!hasCompany}>
            <Building2 className="h-4 w-4 mr-1" /> Perfil da empresa
          </TabsTrigger>
          <TabsTrigger value="share">
            <BarChart3 className="h-4 w-4 mr-1" /> Market share
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cnpj" className="space-y-4 mt-4">
          {cnpj ? (
            <>
              <CompanyProfileCard
                cnpj={cnpj}
                rfb={cross.data?.rfb ?? null}
                anatelRows={byCnpj.data?.rows ?? []}
                loading={cross.isLoading || byCnpj.isLoading}
              />
              <CompanyFootprintTable rows={footprint} loading={footprintLoading} />
            </>
          ) : (
            <Card className="p-6 bg-zinc-900/60 border-zinc-800 text-sm text-zinc-500">
              Pesquise uma empresa pelo nome ou CNPJ acima, ou clique numa empresa do ranking de Market share.
            </Card>
          )}
        </TabsContent>

        <TabsContent value="share" className="space-y-4 mt-4">
          <Card className="p-0 bg-zinc-900/60 border-zinc-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="space-y-0.5">
                <div className="text-sm text-zinc-100 font-medium">
                  Market share — <span className="text-emerald-400">{scopeLabel}</span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  {shareView === "companies"
                    ? <>Ranking de empresas no recorte selecionado{totalGeo != null ? ` · ${formatNum(totalGeo)} acessos` : ""}{nEmpresas != null ? ` · ${formatNum(nEmpresas)} provedores` : ""}</>
                    : <>Liderança e concentração por município{hasGeoFilter ? ` · filtro: ${scopeLabel}` : ""} · {shareByCity.length} municípios</>}
                </div>
              </div>
              <div className="inline-flex rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShareView("companies")}
                  className={`h-7 px-3 text-xs ${shareView === "companies" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
                >
                  Empresas
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShareView("cities")}
                  className={`h-7 px-3 text-xs ${shareView === "cities" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
                >
                  Visão por Cidades
                </Button>
              </div>
            </div>

            {shareView === "companies" ? (
              !companyRanking.length && !companyLoading ? (
                <div className="px-4 py-8 text-center text-xs text-zinc-500">
                  Use a barra de filtros acima e clique em <span className="text-emerald-400">Buscar</span> para carregar o ranking.
                </div>
              ) : (
                <CompanyShareTable
                  rows={companyRanking}
                  loading={companyLoading}
                  onCompanyClick={handleCompanyClick}
                />
              )
            ) : (
              <div className="overflow-auto max-h-[60vh]">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-900 sticky top-0">
                    <tr className="text-left text-zinc-400">
                      <th className="px-3 py-2">Município</th>
                      <th className="px-3 py-2">UF</th>
                      <th className="px-3 py-2 text-right">Acessos</th>
                      <th className="px-3 py-2 text-right"># Provedores</th>
                      <th className="px-3 py-2">Líder</th>
                      <th className="px-3 py-2 text-right">Share líder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shareByCity.map((r, i) => {
                      const share = Number(r.share_lider ?? 0);
                      const liderCnpj = String(r.lider_cnpj ?? "").replace(/\D/g, "");
                      const clickable = liderCnpj.length === 14;
                      return (
                        <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                          <td className="px-3 py-2 text-zinc-200">{r.cidade ?? "—"}</td>
                          <td className="px-3 py-2 text-zinc-400">{r.estado ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatNum(Number(r.acessos))}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatNum(Number(r.n_provedores))}</td>
                          <td className="px-3 py-2 truncate max-w-[220px] break-words">
                            {clickable ? (
                              <button
                                onClick={() => handleCompanyClick({ empresa: r.lider, cnpj: liderCnpj })}
                                className="text-left text-zinc-100 hover:text-emerald-400 hover:underline underline-offset-2 cursor-pointer"
                              >
                                {r.lider ?? "—"}
                              </button>
                            ) : (
                              <span className="text-zinc-300">{r.lider ?? "—"}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-zinc-800 rounded overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, share)}%` }} />
                              </div>
                              <span className="tabular-nums text-emerald-300 w-12 text-right">{share.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!shareByCity.length && !shareLoading && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">Use a barra de filtros para carregar o market share por cidade.</td></tr>
                    )}
                    {shareLoading && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Carregando…</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (embedded) return content;
  return <div className="min-h-screen bg-zinc-950 text-zinc-100">{content}</div>;
}
