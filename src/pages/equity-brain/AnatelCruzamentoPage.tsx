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
import { CompanyProfileCard } from "@/components/equity-brain/CompanyProfileCard";
import { formatNum } from "@/lib/anatelInsights";

export default function AnatelCruzamentoPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [cnpjInput, setCnpjInput] = useState("");
  const [cnpj, setCnpj] = useState<string | null>(null);
  const schema = useAnatelSchema();

  const mainTable = schema.data?.tables?.find((t: any) =>
    /anatel|acessos|stel|provedor|broadband/i.test(t.table_name || ""),
  )?.table_name ?? schema.data?.tables?.[0]?.table_name ?? null;

  const cnpjCol = schema.data?.columns?.find(
    (c: any) => c.table_name === mainTable && /cnpj/i.test(c.column_name),
  )?.column_name;

  const byCnpj = useAnatelByCnpj(cnpj, mainTable, { cnpj_column: cnpjCol });
  const cross = useCrossRefRfbAnatel(cnpj, mainTable, cnpjCol);

  const [statsLoading, setStatsLoading] = useState(false);
  const [shareByCity, setShareByCity] = useState<any[]>([]);

  async function loadShare() {
    if (!mainTable) return;
    setStatsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("anatel-query", {
        body: { action: "stats", params: { table: mainTable, kind: "share_by_municipio", limit: 100 } },
      });
      if (error) throw error;
      setShareByCity(data?.rows ?? []);
    } catch (e: any) {
      toast.error("Falha ao carregar market share: " + (e?.message ?? "erro"));
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

      <Tabs defaultValue="cnpj" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="cnpj"><Building2 className="h-4 w-4 mr-1" /> Perfil por CNPJ</TabsTrigger>
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
            <CompanyProfileCard
              cnpj={cnpj}
              rfb={cross.data?.rfb ?? null}
              anatelRows={byCnpj.data?.rows ?? []}
              loading={cross.isLoading || byCnpj.isLoading}
            />
          )}
        </TabsContent>

        <TabsContent value="share" className="space-y-4 mt-4">
          <div>
            <Button onClick={loadShare} disabled={statsLoading || !mainTable}>
              {statsLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-1" />}
              Carregar market share
            </Button>
          </div>
          <Card className="p-0 bg-zinc-900/60 border-zinc-800 overflow-hidden">
            <div className="text-xs text-zinc-400 px-4 py-2 border-b border-zinc-800">
              Líder e concentração de mercado por município (snapshot atual)
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
                  {shareByCity.map((r, i) => {
                    const share = Number(r.share_lider ?? 0);
                    return (
                      <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                        <td className="px-3 py-2 text-zinc-200">{r.cidade ?? "—"}</td>
                        <td className="px-3 py-2 text-zinc-400">{r.estado ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatNum(Number(r.acessos))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatNum(Number(r.n_provedores))}</td>
                        <td className="px-3 py-2 text-zinc-200 truncate max-w-[200px]">{r.lider ?? "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-zinc-800 rounded overflow-hidden">
                              <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${Math.min(100, share)}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-emerald-300 w-12 text-right">
                              {share.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!shareByCity.length && !statsLoading && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">Clique em "Carregar market share"</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (embedded) return content;
  return <div className="min-h-screen bg-zinc-950 text-zinc-100">{content}</div>;
}
