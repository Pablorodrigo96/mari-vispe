import { useEffect, useState } from "react";
import { Database, RefreshCw, CheckCircle2, XCircle, Loader2, Settings2, Search, Activity, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ExpandRFBDialog } from "@/components/equity-brain/crm/ExpandRFBDialog";
import { toast } from "sonner";

type Status = {
  connected: boolean;
  schemas?: string[];
  tables?: { schema: string; name: string; approx_rows: number }[];
  errors?: any[];
};

type ImportRow = { day: string; n: number; ufs: string[]; sources: string[] };

export default function RfbHubPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [queueStats, setQueueStats] = useState<{ pending: number; processed_24h: number } | null>(null);
  const [fallbackOn, setFallbackOn] = useState<boolean>(true);
  const [savingToggle, setSavingToggle] = useState(false);

  async function loadStatus() {
    setLoadingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke("cnpj-db-inspect", {
        body: {},
      });
      if (error) throw error;
      // edge function returns full payload via GET; invoke uses POST — fallback to fetch
      setStatus(data as Status);
    } catch (e: any) {
      // try direct GET
      try {
        const url = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/cnpj-db-inspect?samples=0`;
        const res = await fetch(url, {
          headers: {
            apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}`,
          },
        });
        const j = await res.json();
        setStatus(j);
      } catch (err: any) {
        toast.error("Falha ao consultar status RFB: " + (err?.message ?? "erro"));
      }
    } finally {
      setLoadingStatus(false);
    }
  }

  async function loadImports() {
    const { data, error } = await supabase
      .schema("equity_brain" as any)
      .from("companies")
      .select("created_at,uf,source")
      .eq("source", "rfb_expand")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return;
    const groups = new Map<string, ImportRow>();
    for (const r of (data ?? []) as any[]) {
      const day = String(r.created_at).slice(0, 10);
      const g = groups.get(day) ?? { day, n: 0, ufs: [], sources: [] };
      g.n += 1;
      if (r.uf && !g.ufs.includes(r.uf)) g.ufs.push(r.uf);
      groups.set(day, g);
    }
    // also count buyers with source rfb_expand
    const { data: bdata } = await supabase
      .schema("equity_brain" as any)
      .from("buyers")
      .select("created_at,source")
      .eq("source", "rfb_expand")
      .order("created_at", { ascending: false })
      .limit(500);
    for (const r of (bdata ?? []) as any[]) {
      const day = String(r.created_at).slice(0, 10);
      const g = groups.get(day) ?? { day, n: 0, ufs: [], sources: [] };
      g.n += 1;
      if (!g.sources.includes("buyers")) g.sources.push("buyers");
      groups.set(day, g);
    }
    setImports([...groups.values()].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 30));
  }

  async function loadQueue() {
    try {
      const { data: pending } = await supabase
        .schema("equity_brain" as any)
        .from("match_queue")
        .select("id", { count: "exact", head: true })
        .is("processed_at", null);
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data: done } = await supabase
        .schema("equity_brain" as any)
        .from("match_queue")
        .select("id", { count: "exact", head: true })
        .gte("processed_at", since);
      setQueueStats({
        pending: (pending as any)?.length ?? (pending as any)?.count ?? 0,
        processed_24h: (done as any)?.length ?? (done as any)?.count ?? 0,
      });
    } catch {
      // ignore
    }
  }

  async function loadToggle() {
    const { data } = await supabase
      .from("integrations_config")
      .select("value")
      .eq("key", "brasilapi_fallback_enabled")
      .maybeSingle();
    setFallbackOn(((data?.value ?? "true") + "").toLowerCase() !== "false");
  }

  async function toggleFallback(next: boolean) {
    setSavingToggle(true);
    setFallbackOn(next);
    const { error } = await supabase
      .from("integrations_config")
      .upsert({ key: "brasilapi_fallback_enabled", value: String(next) }, { onConflict: "key" });
    setSavingToggle(false);
    if (error) {
      toast.error("Falha ao salvar: " + error.message);
      setFallbackOn(!next);
    } else {
      toast.success("Configuração salva");
    }
  }

  async function runWorker() {
    const { data, error } = await supabase.functions.invoke("process-match-queue", { body: { limit: 20 } });
    if (error) toast.error("Erro: " + error.message);
    else toast.success(`Worker executou: ${(data as any)?.processed ?? 0} item(s)`);
    loadQueue();
  }

  useEffect(() => {
    loadStatus();
    loadImports();
    loadQueue();
    loadToggle();
  }, []);

  const mainTables = (status?.tables ?? []).filter((t) =>
    ["empresas", "estabelecimentos", "cnaes", "estabelecimentos_detalhados", "socios", "simples"].includes(t.name),
  );

  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-full">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-400" />
            Base Nacional · Receita Federal
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            ~5M CNPJs ativos. Use para enriquecer empresas conhecidas e descobrir novos prospects (compradores e vendedores).
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadStatus} disabled={loadingStatus}
          className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-900">
          {loadingStatus ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Recarregar
        </Button>
      </header>

      {/* Status da conexão */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-100">Status da conexão</h2>
        </div>
        {!status ? (
          <div className="text-xs text-zinc-500">Consultando…</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs">
              {status.connected ? (
                <><CheckCircle2 className="h-4 w-4 text-emerald-400" /> <span className="text-emerald-300 font-medium">Conectado</span></>
              ) : (
                <><XCircle className="h-4 w-4 text-rose-400" /> <span className="text-rose-300 font-medium">Sem conexão</span></>
              )}
              <span className="text-zinc-500">· {status.schemas?.length ?? 0} schemas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {mainTables.map((t) => (
                <div key={t.name} className="rounded bg-zinc-950 border border-zinc-800 p-3">
                  <div className="text-[10px] uppercase text-zinc-500">{t.schema}</div>
                  <div className="text-sm font-semibold text-zinc-100">{t.name}</div>
                  <div className="text-xs text-emerald-300 tabular-nums mt-1">
                    ~{Number(t.approx_rows).toLocaleString("pt-BR")} linhas
                  </div>
                </div>
              ))}
              {mainTables.length === 0 && (
                <div className="text-xs text-zinc-500 col-span-3">Nenhuma tabela conhecida encontrada na base.</div>
              )}
            </div>
            {(status.errors?.length ?? 0) > 0 && (
              <details className="text-[11px] text-zinc-500">
                <summary className="cursor-pointer hover:text-zinc-300">Ver {status.errors!.length} aviso(s)</summary>
                <pre className="mt-2 p-2 bg-zinc-950 rounded overflow-auto max-h-40">{JSON.stringify(status.errors, null, 2)}</pre>
              </details>
            )}
          </div>
        )}
      </section>

      {/* Busca livre */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-bold text-zinc-100">Buscar e importar empresas</h2>
          </div>
          <div className="flex gap-2">
            <ExpandRFBDialog target="companies" triggerLabel="Importar empresas (alvos M&A)" onCompleted={() => { loadImports(); loadQueue(); }} />
            <ExpandRFBDialog target="buyers" triggerLabel="Importar compradores potenciais" onCompleted={() => { loadImports(); loadQueue(); }} />
          </div>
        </div>
        <p className="text-[11px] text-zinc-500">
          Filtre por setor, UF, capital mínimo e idade. Resultados entram como <span className="text-zinc-300">não qualificados</span> e disparam recálculo de matches.
        </p>
      </section>

      {/* Worker / fila */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-bold text-zinc-100">Fila de matches (worker)</h2>
          </div>
          <Button size="sm" variant="outline" onClick={runWorker}
            className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-900 h-7 text-xs">
            Executar agora
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded bg-zinc-950 border border-zinc-800 p-3">
            <div className="text-zinc-500 text-[10px] uppercase">Pendentes</div>
            <div className="text-emerald-300 text-lg font-bold tabular-nums">{queueStats?.pending ?? "—"}</div>
          </div>
          <div className="rounded bg-zinc-950 border border-zinc-800 p-3">
            <div className="text-zinc-500 text-[10px] uppercase">Processados (24h)</div>
            <div className="text-zinc-100 text-lg font-bold tabular-nums">{queueStats?.processed_24h ?? "—"}</div>
          </div>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2">Cron roda automaticamente a cada 5 minutos.</p>
      </section>

      {/* Histórico */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-bold text-zinc-100 mb-3">Últimas importações RFB</h2>
        {imports.length === 0 ? (
          <div className="text-xs text-zinc-500">Nenhuma importação ainda. Use os botões acima.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-zinc-500 text-[10px] uppercase">
                <tr>
                  <th className="text-left py-2 pr-3">Data</th>
                  <th className="text-right py-2 pr-3">Registros</th>
                  <th className="text-left py-2 pr-3">UFs</th>
                  <th className="text-left py-2">Tipo</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {imports.map((r) => (
                  <tr key={r.day} className="border-t border-zinc-800">
                    <td className="py-2 pr-3 tabular-nums">{r.day}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-300 font-semibold">{r.n}</td>
                    <td className="py-2 pr-3 text-zinc-400">{r.ufs.join(", ") || "—"}</td>
                    <td className="py-2 text-zinc-500">{r.sources.includes("buyers") ? "buyers + companies" : "companies"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Toggle BrasilAPI */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-100">Configurações</h2>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="brasilapi-toggle" className="text-xs text-zinc-200">Fallback BrasilAPI (QSA + Simples)</Label>
            <p className="text-[10px] text-zinc-500 mt-1">
              Quando a base local não tem sócios/regime tributário, consulta a BrasilAPI (gratuita, sem chave). Desligue se a base local passar a fornecer esses dados.
            </p>
          </div>
          <Switch id="brasilapi-toggle" checked={fallbackOn} disabled={savingToggle} onCheckedChange={toggleFallback} />
        </div>
      </section>
    </div>
  );
}
