import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Upload, Download, CheckCircle, XCircle, Loader2, FileSpreadsheet, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { downloadTemplate, parseFile, ENTITY_LABELS } from "@/lib/ebImportTemplates";

type Entity = "companies" | "mandates" | "buyers" | "contacts" | "activities" | "bundle";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entity: Entity;
  onSuccess?: () => void;
}

interface ImportResult {
  entity: string;
  inserted: number;
  updated: number;
  skipped: number;
  errors: { row: number; field?: string; msg: string }[];
  warnings?: { row: number; field?: string; msg: string }[];
}

export function ImportDialog({ open, onOpenChange, entity, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<{ rows?: any[]; bundle?: Record<string, any[]> } | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  const reset = () => {
    setParsed(null); setResults(null); setRunning(false); setParsing(false);
    if (fileRef.current) fileRef.current.value = "";
  };
  const close = () => { reset(); onOpenChange(false); };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setParsing(true);
    try {
      const out = await parseFile(file);
      const rows = out.rows;
      const bundle = out.bundle;
      if (!rows?.length && !bundle) { toast.error("Arquivo vazio"); return; }
      setParsed({ rows, bundle });
    } catch (err: any) { toast.error("Erro ao ler arquivo: " + err.message); }
    finally { setParsing(false); }
  };

  const totalRows = parsed?.bundle
    ? Object.values(parsed.bundle).reduce((s, r) => s + r.length, 0)
    : (parsed?.rows?.length || 0);

  const submit = async (asDry: boolean) => {
    if (!parsed) return;
    setRunning(true); setResults(null);
    try {
      const body: any = entity === "bundle"
        ? { entity: "bundle", bundle: parsed.bundle, dry_run: asDry }
        : { entity, rows: parsed.rows, dry_run: asDry };
      const { data, error } = await supabase.functions.invoke("eb-import", { body });
      if (error) throw error;
      setResults(data.results);
      const totalIn = (data.results || []).reduce((s: number, r: ImportResult) => s + r.inserted, 0);
      const totalErr = (data.results || []).reduce((s: number, r: ImportResult) => s + r.errors.length, 0);
      if (asDry) {
        toast.success(`Validação: ${totalIn} OK · ${totalErr} erros`);
      } else {
        toast.success(`${totalIn} registros importados — recálculo em background`);
        onSuccess?.();
      }
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "desconhecido"));
    } finally { setRunning(false); }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-hidden flex flex-col bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#D9F564]" />
            Importar — {entity === "bundle" ? "Pacote completo" : ENTITY_LABELS[entity as Exclude<Entity, "bundle">]}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Suba .xlsx ou .csv. Sistema valida, mostra erros, e (em modo commit) dispara matches/scores automaticamente.
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="border-2 border-dashed border-zinc-800 rounded-lg p-8 w-full text-center bg-zinc-900/40">
              <Upload className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400 mb-4">Selecione .xlsx ou .csv</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => downloadTemplate(entity)} className="bg-transparent border-zinc-700">
                  <Download className="w-4 h-4 mr-2" /> Baixar Modelo
                </Button>
                <Button onClick={() => fileRef.current?.click()} disabled={parsing} className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90">
                  {parsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Selecionar Arquivo
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">{totalRows} linhas</Badge>
                {parsed.bundle && (
                  <span className="text-xs text-zinc-500">
                    {Object.entries(parsed.bundle).map(([k, v]) => `${k}: ${v.length}`).join(" · ")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>Dry-run</span>
                <Switch checked={dryRun} onCheckedChange={setDryRun} disabled={running} />
              </div>
            </div>

            {results && (
              <ScrollArea className="max-h-72 border border-zinc-800 rounded-lg p-3">
                {results.map((r, idx) => (
                  <div key={idx} className="mb-3 pb-3 border-b border-zinc-800 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-zinc-100">{ENTITY_LABELS[r.entity as keyof typeof ENTITY_LABELS] || r.entity}</span>
                      <Badge className="bg-emerald-950 text-emerald-300 border-emerald-900"><CheckCircle className="w-3 h-3 mr-1" />{r.inserted} OK</Badge>
                      {r.errors.length > 0 && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{r.errors.length} erros</Badge>}
                    </div>
                    {r.errors.slice(0, 10).map((e, i) => (
                      <div key={i} className="text-[11px] text-rose-300 ml-2">
                        Linha {e.row}{e.field ? ` · ${e.field}` : ""}: {e.msg}
                      </div>
                    ))}
                    {r.errors.length > 10 && <div className="text-[11px] text-zinc-500 ml-2">+ {r.errors.length - 10} outros erros…</div>}
                  </div>
                ))}
              </ScrollArea>
            )}

            <div className="flex gap-3 justify-end pt-2 mt-auto">
              <Button variant="outline" onClick={reset} disabled={running} className="bg-transparent border-zinc-700">Trocar arquivo</Button>
              <Button onClick={() => submit(true)} disabled={running} variant="outline" className="bg-transparent border-zinc-700">
                {running && dryRun ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Validar (dry-run)
              </Button>
              <Button onClick={() => submit(false)} disabled={running || dryRun} className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 disabled:opacity-50">
                {running && !dryRun ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Importar {totalRows} linhas
              </Button>
            </div>
            {dryRun && <p className="text-[10px] text-zinc-500 text-right">Desligue Dry-run para gravar no banco e disparar recálculos.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
