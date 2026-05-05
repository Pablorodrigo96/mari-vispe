import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Loader2, Database, Building2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useAnatelSchema, useAnatelByCnpj, useCrossRefRfbAnatel } from "@/hooks/useAnatelData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(Number(n));
}

export default function AnatelCruzamentoPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [cnpjInput, setCnpjInput] = useState("");
  const [cnpj, setCnpj] = useState<string | null>(null);
  const schema = useAnatelSchema();

  // Try to auto-detect main table + cnpj column
  const mainTable = schema.data?.tables?.find((t: any) =>
    /anatel|acessos|stel|provedor|broadband/i.test(t.table_name || ""),
  )?.table_name ?? schema.data?.tables?.[0]?.table_name ?? null;

  const cnpjCol = schema.data?.columns?.find(
    (c: any) => c.table_name === mainTable && /cnpj/i.test(c.column_name),
  )?.column_name;

  const byCnpj = useAnatelByCnpj(cnpj, mainTable, { cnpj_column: cnpjCol });
  const cross = useCrossRefRfbAnatel(cnpj, mainTable, cnpjCol);

  // Stats: top growth + share
  const [statsLoading, setStatsLoading] = useState(false);
  const [topGrowth, setTopGrowth] = useState<any[]>([]);
  const [shareByCity, setShareByCity] = useState<any[]>([]);

  async function loadStats() {
    if (!mainTable) return;
    setStatsLoading(true);
    try {
      const [g, s] = await Promise.all([
        supabase.functions.invoke("anatel-query", {
          body: { action: "stats", params: { table: mainTable, kind: "top_growth", limit: 50 } },
        }),
        supabase.functions.invoke("anatel-query", {
          body: { action: "stats", params: { table: mainTable, kind: "share_by_municipio", limit: 100 } },
        }),
      ]);
      if (g.error) throw g.error;
      if (s.error) throw s.error;
      setTopGrowth(g.data?.rows ?? []);
      setShareByCity(s.data?.rows ?? []);
    } catch (e: any) {
      toast.error("Falha ao carregar stats: " + (e?.message ?? "erro"));
    } finally {
      setStatsLoading(false);
    }
  }

  function submitCnpj(e: React.FormEvent) {
    e.preventDefault();
    const clean = cnpjInput.replace(/\D/g, "");
    if (clean.length !== 14) {
      toast.error("CNPJ inválido");
      return;
    }
    setCnpj(clean);
  }

  const content = (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-7xl px-6 py-8 space-y-6"}>
        {!embedded && (
          <div className="flex items-center justify-between">
            <div>
              <Link to="/equity-brain/hoje" className="text-zinc-500 hover:text-zinc-200 inline-flex items-center gap-1 text-xs">
                <ArrowLeft className="h-3 w-3" /> voltar
              </Link>
              <h1 className="text-2xl font-semibold mt-2 flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-400" />
                Cruzamento RFB × Anatel
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Cruze dados públicos da Receita Federal com a base Anatel para gerar insights de mercado por CNPJ, município e tendência.
              </p>
            </div>
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

        {schema.data && (
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <div className="text-xs text-zinc-400 mb-2">Conexão estabelecida</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-emerald-950/40 border border-emerald-900 text-emerald-200">
                {schema.data.tables?.length ?? 0} tabelas
              </span>
              <span className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700">
                tabela principal: <b className="text-zinc-100">{mainTable ?? "—"}</b>
              </span>
              {cnpjCol && (
                <span className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700">
                  coluna CNPJ: <b className="text-zinc-100">{cnpjCol}</b>
                </span>
              )}
            </div>
          </Card>
        )}

        <Tabs defaultValue="cnpj" className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="cnpj"><Building2 className="h-4 w-4 mr-1" /> Por CNPJ</TabsTrigger>
            <TabsTrigger value="growth"><BarChart3 className="h-4 w-4 mr-1" /> Top crescimento</TabsTrigger>
            <TabsTrigger value="share"><BarChart3 className="h-4 w-4 mr-1" /> Market share por município</TabsTrigger>
          </TabsList>

          <TabsContent value="cnpj" className="space-y-4 mt-4">
            <form onSubmit={submitCnpj} className="flex gap-2">
              <Input
                value={cnpjInput}
                onChange={(e) => setCnpjInput(e.target.value)}
                placeholder="Digite o CNPJ (14 dígitos)"
                className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-xs"
              />
              <Button type="submit" disabled={!mainTable}>
                <Search className="h-4 w-4 mr-1" /> Buscar
              </Button>
            </form>

            {cnpj && (
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-4 bg-zinc-900/60 border-zinc-800">
                  <div className="text-xs text-zinc-400 mb-2">Receita Federal (RFB)</div>
                  {cross.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {cross.data?.rfb ? (
                    <pre className="text-xs text-zinc-200 whitespace-pre-wrap break-words">
                      {JSON.stringify(cross.data.rfb, null, 2)}
                    </pre>
                  ) : !cross.isLoading && (
                    <div className="text-xs text-zinc-500">Sem dados RFB</div>
                  )}
                </Card>

                <Card className="p-4 bg-zinc-900/60 border-zinc-800">
                  <div className="text-xs text-zinc-400 mb-2">Anatel</div>
                  {byCnpj.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {byCnpj.data?.rows?.length ? (
                    <div className="text-xs text-zinc-200 space-y-1 max-h-96 overflow-auto">
                      <div className="text-zinc-400 mb-1">{byCnpj.data.rows.length} registros</div>
                      <pre className="whitespace-pre-wrap break-words">
                        {JSON.stringify(byCnpj.data.rows.slice(0, 12), null, 2)}
                      </pre>
                    </div>
                  ) : !byCnpj.isLoading && (
                    <div className="text-xs text-zinc-500">Nenhum registro Anatel para este CNPJ</div>
                  )}
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="growth" className="space-y-4 mt-4">
            <div>
              <Button onClick={loadStats} disabled={statsLoading || !mainTable}>
                {statsLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-1" />}
                Carregar rankings
              </Button>
            </div>
            <Card className="p-0 bg-zinc-900/60 border-zinc-800 overflow-hidden">
              <div className="text-xs text-zinc-400 px-4 py-2 border-b border-zinc-800">
                Top 50 ISPs por crescimento de acessos (último mês × 12 meses atrás)
              </div>
              <div className="overflow-auto max-h-[60vh]">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-900 sticky top-0">
                    <tr className="text-left text-zinc-400">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">CNPJ</th>
                      <th className="px-3 py-2">Provedor</th>
                      <th className="px-3 py-2 text-right">Acessos atual</th>
                      <th className="px-3 py-2 text-right">12m atrás</th>
                      <th className="px-3 py-2 text-right">Δ %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topGrowth.map((r, i) => (
                      <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                        <td className="px-3 py-2 text-zinc-500">{i + 1}</td>
                        <td className="px-3 py-2 font-mono">{r.cnpj}</td>
                        <td className="px-3 py-2">{r.provider_name ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{fmt(r.current_accesses)}</td>
                        <td className="px-3 py-2 text-right">{fmt(r.past_accesses)}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${Number(r.growth_pct) > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {r.growth_pct != null ? `${Number(r.growth_pct).toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                    {!topGrowth.length && !statsLoading && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">Clique em "Carregar rankings"</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="share" className="space-y-4 mt-4">
            <div>
              <Button onClick={loadStats} disabled={statsLoading || !mainTable}>
                {statsLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-1" />}
                Carregar rankings
              </Button>
            </div>
            <Card className="p-0 bg-zinc-900/60 border-zinc-800 overflow-hidden">
              <div className="text-xs text-zinc-400 px-4 py-2 border-b border-zinc-800">
                Market share por município (líder + concorrentes)
              </div>
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
                    {shareByCity.map((r, i) => (
                      <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                        <td className="px-3 py-2">{r.municipio ?? "—"}</td>
                        <td className="px-3 py-2">{r.uf ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{fmt(r.total_accesses)}</td>
                        <td className="px-3 py-2 text-right">{fmt(r.n_providers)}</td>
                        <td className="px-3 py-2 font-mono">{r.leader_cnpj ?? "—"}</td>
                        <td className="px-3 py-2 text-right">
                          {r.leader_share != null ? `${(Number(r.leader_share) * 100).toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                    {!shareByCity.length && !statsLoading && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">Clique em "Carregar rankings"</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
