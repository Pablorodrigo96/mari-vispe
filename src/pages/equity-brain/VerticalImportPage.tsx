import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Download, ExternalLink } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVerticalRegistry, useVertical } from "@/hooks/useVerticalRegistry";

interface ParsedRow {
  cnpj: string;
  razao_social?: string | null;
  uf?: string | null;
  municipio?: string | null;
  cnae?: string | null;
  metric_1?: number | null;
  metric_2?: number | null;
  category?: string | null;
  source_url?: string | null;
  data_corte?: string | null;
  raw: Record<string, any>;
}

const REQUIRED = ["cnpj"];
const HEADERS_HINT = ["cnpj","razao_social","uf","municipio","cnae","metric_1","metric_2","category","source_url","data_corte"];

function normalizeCnpj(v: any): string | null {
  if (v === null || v === undefined) return null;
  const digits = String(v).replace(/\D+/g, "");
  if (digits.length !== 14) return null;
  return digits;
}
function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export default function VerticalImportPage() {
  const { slug: slugParam } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { data: registry = [] } = useVerticalRegistry();
  const [slug, setSlug] = useState<string>(slugParam ?? "");
  useEffect(() => { if (slugParam) setSlug(slugParam); }, [slugParam]);

  const { data: vertical } = useVertical(slug);

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [dataCorte, setDataCorte] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [committed, setCommitted] = useState<{ inserted: number; skipped: number } | null>(null);

  const headers = useMemo(() => HEADERS_HINT, []);

  async function parseFile(f: File) {
    setBusy(true);
    setErrors([]);
    setRows([]);
    setCommitted(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const out: ParsedRow[] = [];
      const errs: string[] = [];
      json.forEach((r, i) => {
        const lower: Record<string, any> = {};
        Object.keys(r).forEach((k) => { lower[k.trim().toLowerCase()] = r[k]; });
        const cnpj = normalizeCnpj(lower.cnpj);
        if (!cnpj) { errs.push(`Linha ${i + 2}: CNPJ inválido (${lower.cnpj ?? "vazio"})`); return; }
        out.push({
          cnpj,
          razao_social: (lower.razao_social ?? lower["razão_social"] ?? null) || null,
          uf: lower.uf ? String(lower.uf).trim().toUpperCase().slice(0, 2) : null,
          municipio: lower.municipio ? String(lower.municipio).trim() : null,
          cnae: lower.cnae ? String(lower.cnae).trim() : null,
          metric_1: num(lower.metric_1 ?? lower.metrica_1 ?? lower["métrica_1"]),
          metric_2: num(lower.metric_2 ?? lower.metrica_2 ?? lower["métrica_2"]),
          category: lower.category ? String(lower.category).trim() : null,
          source_url: lower.source_url ? String(lower.source_url).trim() : null,
          data_corte: lower.data_corte ? String(lower.data_corte).trim() : null,
          raw: lower,
        });
      });
      setRows(out);
      setErrors(errs.slice(0, 30));
      if (out.length > 0) toast.success(`Parseado: ${out.length} linhas OK · ${errs.length} erros`);
      else toast.error("Nenhuma linha válida encontrada");
    } catch (e: any) {
      toast.error("Falha ao ler arquivo", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!slug || rows.length === 0) return;
    setBusy(true);
    try {
      const corte = dataCorte ? dataCorte : null;
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id ?? null;
      const payload = rows.map((r) => ({
        vertical_slug: slug,
        cnpj: r.cnpj,
        razao_social: r.razao_social,
        uf: r.uf,
        municipio: r.municipio,
        cnae: r.cnae,
        metric_1: r.metric_1,
        metric_2: r.metric_2,
        category: r.category,
        source_url: r.source_url,
        data_corte: r.data_corte || corte,
        raw: r.raw,
        imported_by: uid,
      }));

      // Insert in chunks of 500
      const chunks: any[][] = [];
      for (let i = 0; i < payload.length; i += 500) chunks.push(payload.slice(i, i + 500));
      let inserted = 0;
      let skipped = 0;
      for (const chunk of chunks) {
        const { error, count } = await supabase
          .from("vertical_imports" as any)
          .upsert(chunk, { onConflict: "vertical_slug,cnpj,data_corte", ignoreDuplicates: true, count: "exact" });
        if (error) {
          // If upsert with onConflict expression fails (composite with COALESCE), fall back to insert ignoring dupes
          const { error: e2, count: c2 } = await supabase
            .from("vertical_imports" as any)
            .insert(chunk, { count: "exact" });
          if (e2 && !/duplicate key/i.test(e2.message)) throw e2;
          inserted += c2 ?? chunk.length;
        } else {
          inserted += count ?? chunk.length;
        }
        skipped += chunk.length - (count ?? chunk.length);
      }
      setCommitted({ inserted, skipped });
      toast.success(`Importação concluída: ${inserted} inseridos`);
    } catch (e: any) {
      toast.error("Falha ao inserir", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([{
      cnpj: "12345678000199",
      razao_social: "Exemplo LTDA",
      uf: "SP",
      municipio: "São Paulo",
      cnae: "6201-5/01",
      metric_1: 100,
      metric_2: 0,
      category: "",
      source_url: vertical?.source_url ?? "",
      data_corte: "2026-01-01",
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "vertical_imports");
    XLSX.writeFile(wb, `modelo-${slug || "vertical"}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/equity-brain/hoje" className="text-zinc-500 hover:text-zinc-200 inline-flex items-center gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <h1 className="text-base font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            Importar dados {vertical ? `· ${vertical.label}` : "(vertical)"}
          </h1>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-6 space-y-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 backdrop-blur-md p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Vertical</label>
              <Select value={slug} onValueChange={(v) => navigate(`/equity-brain/vertical/${v}/import`)}>
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-9 text-xs">
                  <SelectValue placeholder="Escolha a vertical" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  {registry.map((v) => <SelectItem key={v.slug} value={v.slug}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Data de corte (opcional)</label>
              <Input type="date" value={dataCorte} onChange={(e) => setDataCorte(e.target.value)} className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-9 text-xs" />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Modelo</label>
              <Button onClick={downloadTemplate} variant="outline" size="sm" disabled={!slug} className="mt-1 h-9 text-xs bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800">
                <Download className="h-3 w-3 mr-1" /> Baixar modelo .xlsx
              </Button>
            </div>
          </div>

          {vertical && (
            <p className="text-[11px] text-zinc-500 break-words">
              <span className="text-zinc-300 font-semibold">{vertical.label}</span> · Métrica principal:{" "}
              <span className="text-emerald-300">{vertical.metric_1_label} ({vertical.metric_1_unit})</span>
              {vertical.source_url && <> · Fonte: <a href={vertical.source_url} target="_blank" rel="noreferrer" className="hover:text-emerald-300 inline-flex items-center gap-0.5">{vertical.source_name} <ExternalLink className="h-2.5 w-2.5" /></a></>}
            </p>
          )}

          <div className="border-2 border-dashed border-zinc-800 rounded-lg p-6 text-center bg-zinc-950/40">
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); void parseFile(f); }
              }} />
            <Upload className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
            <p className="text-xs text-zinc-400 mb-1">Arraste ou selecione um arquivo .csv / .xlsx</p>
            <p className="text-[10px] text-zinc-600 mb-3">Colunas esperadas: {headers.join(", ")}</p>
            <Button onClick={() => fileRef.current?.click()} disabled={!slug || busy} variant="outline" size="sm" className="bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800">
              Escolher arquivo
            </Button>
            {file && <p className="text-[10px] text-zinc-500 mt-2 break-words">{file.name}</p>}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold mb-2">
              <AlertTriangle className="h-3.5 w-3.5" /> {errors.length} erros encontrados (mostrando primeiros 30)
            </div>
            <ul className="text-[11px] text-amber-200/80 space-y-0.5 max-h-40 overflow-auto">
              {errors.map((e, i) => <li key={i} className="font-mono break-words">{e}</li>)}
            </ul>
          </div>
        )}

        {rows.length > 0 && !committed && (
          <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-emerald-300 text-sm font-semibold">{rows.length} linhas prontas para importar</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Vertical: {vertical?.label} · duplicatas (mesmo CNPJ+data) serão ignoradas</div>
            </div>
            <Button onClick={commit} disabled={busy} className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90">
              {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Confirmar importação
            </Button>
          </div>
        )}

        {committed && (
          <div className="rounded-lg border border-[#D9F564]/30 bg-[#D9F564]/5 p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-[#D9F564] mx-auto mb-2" />
            <div className="text-sm text-zinc-100 font-semibold">Importação concluída</div>
            <div className="text-xs text-zinc-400 mt-1">{committed.inserted} novos registros · {committed.skipped} duplicatas ignoradas</div>
            <Link to={`/equity-brain/vertical/${slug}/mercado`}>
              <Button size="sm" variant="outline" className="mt-3 bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800">
                Ver mercado
              </Button>
            </Link>
          </div>
        )}

        {rows.length > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 backdrop-blur-md overflow-hidden">
            <div className="px-4 py-2 border-b border-zinc-800 text-xs font-semibold text-zinc-300">Preview (primeiras 20 linhas)</div>
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-[11px]">
                <thead className="bg-zinc-950 text-zinc-500 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">CNPJ</th>
                    <th className="text-left px-3 py-2">Razão Social</th>
                    <th className="text-left px-3 py-2">UF</th>
                    <th className="text-left px-3 py-2">Município</th>
                    <th className="text-right px-3 py-2">Métrica 1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="hover:bg-zinc-800/40">
                      <td className="px-3 py-1.5 font-mono text-zinc-300">{r.cnpj}</td>
                      <td className="px-3 py-1.5 text-zinc-200 break-words max-w-[260px]">{r.razao_social ?? "—"}</td>
                      <td className="px-3 py-1.5 text-zinc-400 font-mono">{r.uf ?? "—"}</td>
                      <td className="px-3 py-1.5 text-zinc-400 break-words max-w-[180px]">{r.municipio ?? "—"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-emerald-300">{r.metric_1 ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
