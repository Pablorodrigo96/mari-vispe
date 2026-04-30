import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle, Database, History, Snowflake, Calculator, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface ImportRecord {
  id: string;
  file_name: string;
  period_ref: string | null;
  uploaded_at: string;
  total_rows: number | null;
  inserted_rows: number | null;
  rejected_rows: number | null;
  dedup_rows: number | null;
  status: string;
}

interface DryResult {
  total_rows: number;
  valid: number;
  rejected: number;
  internal_duplicates: number;
  errors: { row: number; field?: string; msg: string }[];
  sample?: any[];
}

export default function IspImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [periodRef, setPeriodRef] = useState<string>(""); // YYYY-MM
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dry, setDry] = useState<DryResult | null>(null);
  const [committed, setCommitted] = useState<{ inserted: number; rejected: number } | null>(null);
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [computing, setComputing] = useState(false);
  const [computeResult, setComputeResult] = useState<{ period_ref: string; cities_computed: number; companies_computed: number } | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<{ period_ref: string; matches_inserted: number; thesis_links_upserted: number; companies_with_thesis_fit: number; buyers_targeted: number } | null>(null);

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    const { data } = await supabase
      .schema("equity_brain" as any)
      .from("isp_anatel_imports")
      .select("id,file_name,period_ref,uploaded_at,total_rows,inserted_rows,rejected_rows,dedup_rows,status")
      .order("uploaded_at", { ascending: false })
      .limit(20);
    setHistory((data ?? []) as any);
  }

  async function uploadAndRun(asDry: boolean) {
    if (!file) { toast.error("Selecione um arquivo .csv ou .xlsx"); return; }
    setBusy(true); setDry(null); setCommitted(null);
    try {
      // 1) Upload pro bucket privado
      const ts = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `uploads/${ts}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("isp-anatel").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      // 2) Invoke edge function
      const periodIso = periodRef ? `${periodRef}-01` : null;
      const { data, error } = await supabase.functions.invoke("eb-import-anatel", {
        body: { file_url: path, file_name: file.name, period_ref: periodIso, dry_run: asDry },
      });
      if (error) throw error;

      if (asDry) {
        setDry(data as DryResult);
        toast.success(`Validação: ${data.valid} OK · ${data.rejected} erros · ${data.internal_duplicates} duplicatas no arquivo`);
      } else {
        setCommitted({ inserted: data.inserted, rejected: data.rejected });
        toast.success(`${data.inserted} linhas gravadas (lista fria — não vira CRM)`);
        loadHistory();
      }
    } catch (e: any) {
      toast.error("Erro: " + (e.message || "desconhecido"));
    } finally { setBusy(false); }
  }

  async function recomputeStats() {
    setComputing(true); setComputeResult(null);
    try {
      const periodIso = periodRef ? `${periodRef}-01` : null;
      const { data, error } = await supabase.functions.invoke("eb-compute-isp-stats", {
        body: { period_ref: periodIso },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setComputeResult({
        period_ref: data.period_ref,
        cities_computed: data.cities_computed ?? 0,
        companies_computed: data.companies_computed ?? 0,
      });
      toast.success(`Stats calculadas: ${data.cities_computed} cidades · ${data.companies_computed} empresas (${data.period_ref})`);
    } catch (e: any) {
      toast.error("Erro ao calcular stats: " + (e.message || "desconhecido"));
    } finally { setComputing(false); }
  }

  async function generateColdMatches(asDry: boolean) {
    setMatching(true); if (!asDry) setMatchResult(null);
    try {
      const periodIso = periodRef ? `${periodRef}-01` : null;
      const { data, error } = await supabase.functions.invoke("eb-match-isp-cold", {
        body: { period_ref: periodIso, dry_run: asDry },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (asDry) {
        toast.success(`Preview: ${data.candidate_matches} candidatos · ${data.companies_with_thesis_fit} empresas com fit · ${data.active_buyers} buyers`);
      } else {
        setMatchResult({
          period_ref: data.period_ref,
          matches_inserted: data.matches_inserted ?? 0,
          thesis_links_upserted: data.thesis_links_upserted ?? 0,
          companies_with_thesis_fit: data.companies_with_thesis_fit ?? 0,
          buyers_targeted: data.buyers_targeted ?? 0,
        });
        toast.success(`${data.matches_inserted} sugestões frias geradas (não criam companies, sem notificações)`);
      }
    } catch (e: any) {
      toast.error("Erro ao gerar matches: " + (e.message || "desconhecido"));
    } finally { setMatching(false); }
  }

  return (
    <div className="p-6 space-y-5 bg-zinc-950 min-h-full">
      <Link to="/equity-brain/crm/imports" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-3 w-3" /> Voltar a Imports
      </Link>

      <header className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded bg-blue-950/40 text-blue-300 border border-blue-900">
            <Snowflake className="h-4 w-4" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">ISPs Anatel — Lista Fria</h1>
        </div>
        <p className="text-[11px] text-zinc-500 mt-2 max-w-2xl break-words">
          Suba a base de banda larga fixa da Anatel (CSV/XLSX). Os dados entram como <strong>inteligência de mercado</strong> — NÃO viram clientes qualificados,
          NÃO disparam workflows de CRM e NÃO geram leads quentes. Só após a Fase 4 (match-engine) eles aparecem como <em>sugestões frias</em> conectadas à tese ISPs.
        </p>
      </header>

      {/* Upload card */}
      <div className="rounded border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[260px]">
            <label className="text-[11px] text-zinc-400 block mb-1">Arquivo (.csv ou .xlsx)</label>
            <Input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setDry(null); setCommitted(null); }}
              className="bg-zinc-950 border-zinc-700 text-zinc-200 file:text-zinc-300"
            />
            {file && <p className="text-[10px] text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
          </div>
          <div className="w-[180px]">
            <label className="text-[11px] text-zinc-400 block mb-1">Período (YYYY-MM)</label>
            <Input
              type="month"
              value={periodRef}
              onChange={(e) => setPeriodRef(e.target.value)}
              className="bg-zinc-950 border-zinc-700 text-zinc-200"
            />
            <p className="text-[10px] text-zinc-500 mt-1">Sobrescreve período da planilha</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={dryRun} onCheckedChange={setDryRun} disabled={busy} />
            <span className="text-xs text-zinc-300">Dry-run</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-zinc-800">
          <Button
            variant="outline"
            disabled={!file || busy}
            onClick={() => uploadAndRun(true)}
            className="bg-transparent border-zinc-700"
          >
            {busy && dryRun ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
            Validar (dry-run)
          </Button>
          <Button
            disabled={!file || busy || dryRun}
            onClick={() => uploadAndRun(false)}
            className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 disabled:opacity-50"
          >
            {busy && !dryRun ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Gravar lista fria
          </Button>
        </div>
        {dryRun && <p className="text-[10px] text-zinc-500 text-right">Desligue Dry-run para gravar de fato.</p>}
      </div>

      {/* Dry-run result */}
      {dry && (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#D9F564]" />
            <span className="text-sm text-zinc-100 font-medium">Resultado da validação</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Stat label="Linhas no arquivo" value={dry.total_rows} />
            <Stat label="Válidas" value={dry.valid} tone="ok" />
            <Stat label="Rejeitadas" value={dry.rejected} tone={dry.rejected > 0 ? "bad" : "muted"} />
            <Stat label="Duplicatas internas" value={dry.internal_duplicates} tone="muted" />
          </div>
          {dry.errors?.length > 0 && (
            <div className="border-t border-zinc-800 pt-3">
              <div className="text-[11px] text-zinc-400 mb-2">Primeiros erros:</div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {dry.errors.slice(0, 30).map((e, i) => (
                  <div key={i} className="text-[11px] text-rose-300">
                    Linha {e.row}{e.field ? ` · ${e.field}` : ""}: {e.msg}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Committed result */}
      {committed && (
        <div className="rounded border border-emerald-900 bg-emerald-950/30 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          <div className="text-xs text-emerald-200">
            <strong>{committed.inserted}</strong> linhas inseridas em <code>isp_market_entries</code>
            {committed.rejected > 0 && <> · {committed.rejected} rejeitadas</>}
            <div className="text-[10px] text-emerald-300/70 mt-1">
              Próximo passo (Fase 3): rodar <code>compute-isp-market-stats</code> para gerar HHI, leader e scores.
            </div>
          </div>
        </div>
      )}

      {/* Compute Stats (Fase 3) */}
      <div className="rounded border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-[260px] flex-1">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-[#D9F564]" />
              <span className="text-sm text-zinc-100 font-medium">Fase 3 — Calcular stats de mercado</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 break-words max-w-2xl">
              Recalcula HHI, share do líder, fragmentação e <code>rollup_target_score</code> /{" "}
              <code>local_leader_score</code> / <code>sellability_score</code> por cidade e por CNPJ.
              Usa o período acima ou, se vazio, o mais recente disponível. Idempotente — reprocessa em cima.
            </p>
          </div>
          <Button
            onClick={recomputeStats}
            disabled={computing}
            className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90"
          >
            {computing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
            Recalcular agora
          </Button>
        </div>
        {computeResult && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
            <Stat label="Cidades calculadas" value={computeResult.cities_computed} tone="ok" />
            <Stat label="Empresas (CNPJ)" value={computeResult.companies_computed} tone="ok" />
          </div>
        )}
        {computeResult && (
          <p className="text-[10px] text-zinc-500">Período computado: <span className="text-zinc-300">{computeResult.period_ref}</span></p>
        )}
      </div>

      {/* Fase 4 — Match cold */}
      <div className="rounded border border-fuchsia-900/60 bg-fuchsia-950/10 p-5 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-[260px] flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-300" />
              <span className="text-sm text-zinc-100 font-medium">Fase 4 — Sugestões frias × buyers (tese ISPs)</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 break-words max-w-2xl">
              Cruza ISPs com fit nas 5 teses ISP × buyers ativos com setor/UF/ticket compatível. Grava em{" "}
              <code>matches</code> com <code>is_cold_suggestion=true</code>. <strong>Não cria companies, não dispara notificações.</strong>{" "}
              Cada execução substitui o batch anterior de matches frios das teses ISP.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => generateColdMatches(true)}
              disabled={matching}
              className="bg-transparent border-fuchsia-800 text-fuchsia-200 hover:bg-fuchsia-950/40"
            >
              {matching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
              Preview
            </Button>
            <Button
              onClick={() => generateColdMatches(false)}
              disabled={matching}
              className="bg-fuchsia-700 text-white hover:bg-fuchsia-600"
            >
              {matching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Gerar sugestões
            </Button>
          </div>
        </div>
        {matchResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-fuchsia-900/40">
            <Stat label="Matches gerados" value={matchResult.matches_inserted} tone="ok" />
            <Stat label="Empresas com fit" value={matchResult.companies_with_thesis_fit} />
            <Stat label="Vínculos tese↔CNPJ" value={matchResult.thesis_links_upserted} />
            <Stat label="Buyers alvo" value={matchResult.buyers_targeted} />
          </div>
        )}
        {matchResult && (
          <p className="text-[10px] text-zinc-500">
            Período: <span className="text-zinc-300">{matchResult.period_ref}</span>{" "}
            · Próxima fase: tela <code>/equity-brain/isp/sugestoes</code> e fluxo <code>promote-cold-isp</code>.
          </p>
        )}
      </div>

      {/* History */}
      <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-zinc-400" />
          <span className="text-sm text-zinc-100 font-medium">Histórico de imports</span>
        </div>
        {history.length === 0 ? (
          <p className="text-[11px] text-zinc-500">Nenhum import registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="text-left p-2 font-normal">Arquivo</th>
                  <th className="text-left p-2 font-normal">Período</th>
                  <th className="text-left p-2 font-normal">Quando</th>
                  <th className="text-right p-2 font-normal">Total</th>
                  <th className="text-right p-2 font-normal">OK</th>
                  <th className="text-right p-2 font-normal">Rej.</th>
                  <th className="text-right p-2 font-normal">Dup.</th>
                  <th className="text-left p-2 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-zinc-900 last:border-0">
                    <td className="p-2 break-words max-w-[260px]">{h.file_name}</td>
                    <td className="p-2">{h.period_ref ?? "—"}</td>
                    <td className="p-2 text-zinc-500">{new Date(h.uploaded_at).toLocaleString("pt-BR")}</td>
                    <td className="p-2 text-right">{h.total_rows ?? 0}</td>
                    <td className="p-2 text-right text-emerald-300">{h.inserted_rows ?? 0}</td>
                    <td className="p-2 text-right text-rose-300">{h.rejected_rows ?? 0}</td>
                    <td className="p-2 text-right text-zinc-500">{h.dedup_rows ?? 0}</td>
                    <td className="p-2">
                      <Badge variant="outline" className={
                        h.status === "completed" ? "border-emerald-800 text-emerald-300" :
                        h.status === "partial"   ? "border-amber-800 text-amber-300" :
                        h.status === "running"   ? "border-blue-800 text-blue-300" :
                        "border-zinc-700 text-zinc-400"
                      }>
                        {h.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help */}
      <div className="rounded border border-zinc-800 bg-zinc-900/30 p-4 text-[11px] text-zinc-400 break-words space-y-2">
        <div className="text-zinc-300 font-medium flex items-center gap-2">
          <AlertTriangle className="h-3 w-3 text-amber-400" /> Como esta ingestão respeita a estrutura do Equity Brain
        </div>
        <ul className="list-disc ml-4 space-y-1">
          <li>Os dados gravam <strong>apenas em <code>isp_market_entries</code></strong>, nunca em <code>companies</code>.</li>
          <li>Nenhum CRM, deal, mandate ou buyer é criado. Nenhum match quente é gerado.</li>
          <li>Re-uploads do mesmo (CNPJ × município × período × tecnologia) sofrem upsert — não duplicam.</li>
          <li>Após gravar, na Fase 3, o sistema calcula HHI/leader/sellability_score por município e empresa.</li>
          <li>Promoção de um ISP frio para lead qualificado só acontece via <code>promote-cold-isp</code> (Fase 4) — bloqueado por trigger no banco.</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "bad" | "muted" }) {
  const color =
    tone === "ok"  ? "text-emerald-300" :
    tone === "bad" ? "text-rose-300" :
    tone === "muted" ? "text-zinc-400" : "text-zinc-100";
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950 p-3">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${color}`}>{value.toLocaleString("pt-BR")}</div>
    </div>
  );
}
