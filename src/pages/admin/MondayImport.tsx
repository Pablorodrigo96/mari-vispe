import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'idle' | 'previewing' | 'preview_done' | 'committing' | 'done';

interface PreviewRow {
  razao_social: string;
  company_cnpj: string;
  deal_phase: string;
  deal_type: string;
  outcome: string;
  status: string;
  valor_operacao: number | null;
  faturamento_vispe: number | null;
  responsavel_id: string | null;
  monday_item_id: string | null;
  monday_responsavel_name: string | null;
}

interface ImportResponse {
  import_id: string;
  type: 'sellside' | 'buyside';
  mode: 'preview' | 'commit';
  total_rows: number;
  parsed_rows: number;
  skipped_rows: number;
  preview: PreviewRow[];
  warnings: { row: number; field: string; message: string }[];
  advisors_unmapped: { monday_name: string; occurrences: number }[];
  companies_to_create: { razao_social: string; count: number }[];
  validation_errors: string[];
  subtasks_count?: number;
  result?: {
    mandates_created: number;
    mandates_updated: number;
    companies_created: number;
    subtasks_created: number;
  };
}

function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

export default function MondayImport() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<'sellside' | 'buyside'>('sellside');
  const [mode, setMode] = useState<Mode>('idle');
  const [importId, setImportId] = useState<string>(crypto.randomUUID());
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [commitResult, setCommitResult] = useState<ImportResponse | null>(null);

  const onFileChange = (f: File | null) => {
    setFile(f);
    setPreview(null);
    setCommitResult(null);
    setMode('idle');
    setImportId(crypto.randomUUID());
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFileChange(f);
  }, []);

  const callImport = async (m: 'preview' | 'commit') => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    fd.append('mode', m);
    fd.append('import_id', importId);
    const { data, error } = await supabase.functions.invoke('eb-import-monday', { body: fd });
    if (error) {
      toast({ title: 'Erro no import', description: error.message, variant: 'destructive' });
      return null;
    }
    return data as ImportResponse;
  };

  const onPreview = async () => {
    if (!file) {
      toast({ title: 'Selecione um arquivo XLSX primeiro', variant: 'destructive' });
      return;
    }
    setMode('previewing');
    const r = await callImport('preview');
    if (r) {
      setPreview(r);
      setMode('preview_done');
    } else {
      setMode('idle');
    }
  };

  const onCommit = async () => {
    setMode('committing');
    const r = await callImport('commit');
    if (r) {
      setCommitResult(r);
      setMode('done');
      toast({
        title: 'Import concluído',
        description: `${r.result?.mandates_created ?? 0} criados · ${r.result?.mandates_updated ?? 0} atualizados`,
      });
    } else {
      setMode('preview_done');
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCommitResult(null);
    setMode('idle');
    setImportId(crypto.randomUUID());
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Importar do Monday</h1>
            <p className="text-muted-foreground mt-1">Migração inicial dos mandatos Sellside e Buyside.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/admin/monday-parity">Ver paridade</Link></Button>
            <Button variant="outline" asChild><Link to="/admin/advisors-mapping">Resolver advisors</Link></Button>
          </div>
        </div>

        {/* Step 1 — Upload */}
        <Card>
          <CardHeader><CardTitle>1. Selecione o arquivo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:bg-muted/30 transition"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-foreground">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">({Math.round(file.size / 1024)} KB)</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Arraste o XLSX exportado do Monday ou clique para escolher</p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex items-center gap-6">
              <Label className="text-sm font-medium">Tipo:</Label>
              <RadioGroup value={type} onValueChange={(v) => setType(v as any)} className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="sellside" id="t-sell" />
                  <Label htmlFor="t-sell" className="cursor-pointer">Sellside</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="buyside" id="t-buy" />
                  <Label htmlFor="t-buy" className="cursor-pointer">Buyside</Label>
                </div>
              </RadioGroup>

              <Button onClick={onPreview} disabled={!file || mode === 'previewing' || mode === 'committing'}>
                {mode === 'previewing' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando…</> : 'Pré-visualizar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 — Preview */}
        {preview && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryStat label="Total no XLSX" value={preview.total_rows} />
              <SummaryStat label="Mandatos válidos" value={preview.parsed_rows} accent="emerald" />
              <SummaryStat label="Linhas ignoradas" value={preview.skipped_rows} accent="amber" />
              <SummaryStat label="Subtarefas" value={preview.subtasks_count ?? 0} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Advisors não mapeados ({preview.advisors_unmapped.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {preview.advisors_unmapped.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Todos os executivos foram identificados ✓</p>
                  ) : (
                    <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
                      {preview.advisors_unmapped.map((a) => (
                        <li key={a.monday_name} className="flex justify-between">
                          <span className="text-foreground">{a.monday_name}</span>
                          <Badge variant="outline">{a.occurrences} ocorr.</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                    Empresas a criar como stub ({preview.companies_to_create.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {preview.companies_to_create.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Todas as empresas já existem ✓</p>
                  ) : (
                    <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
                      {preview.companies_to_create.slice(0, 50).map((c) => (
                        <li key={c.razao_social} className="text-foreground">{c.razao_social}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Pré-visualização (10 primeiras linhas)</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fase</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vispe</TableHead>
                      <TableHead>Executivo</TableHead>
                      <TableHead>Item ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.preview.slice(0, 10).map((r) => (
                      <TableRow key={r.monday_item_id ?? r.razao_social}>
                        <TableCell className="font-medium break-words max-w-[220px]">{r.razao_social}</TableCell>
                        <TableCell><Badge variant="outline">{r.deal_type}</Badge></TableCell>
                        <TableCell>{r.deal_phase}</TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell>{fmtMoney(r.valor_operacao)}</TableCell>
                        <TableCell>{fmtMoney(r.faturamento_vispe)}</TableCell>
                        <TableCell className="text-xs">
                          {r.responsavel_id
                            ? <span className="text-emerald-600">✓ {r.monday_responsavel_name}</span>
                            : <span className="text-amber-600">{r.monday_responsavel_name ?? '—'}</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.monday_item_id ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {preview.warnings.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Avisos ({preview.warnings.length})</CardTitle></CardHeader>
                <CardContent className="max-h-40 overflow-y-auto text-xs space-y-1">
                  {preview.warnings.slice(0, 30).map((w, i) => (
                    <div key={i} className="text-muted-foreground">
                      {w.row > 0 ? `Linha ${w.row}: ` : ''}<strong>{w.field}</strong> — {w.message}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {mode !== 'done' && (
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={reset}>Cancelar</Button>
                <Button onClick={onCommit} disabled={mode === 'committing'} size="lg">
                  {mode === 'committing'
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando…</>
                    : <>Confirmar import ({preview.parsed_rows} mandatos) <ArrowRight className="h-4 w-4 ml-2" /></>}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Step 3 — Done */}
        {mode === 'done' && commitResult?.result && (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Import concluído</h3>
                  <p className="text-sm text-muted-foreground">import_id: {commitResult.import_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryStat label="Mandatos criados" value={commitResult.result.mandates_created} accent="emerald" />
                <SummaryStat label="Mandatos atualizados" value={commitResult.result.mandates_updated} />
                <SummaryStat label="Companies stub" value={commitResult.result.companies_created} />
                <SummaryStat label="Subtarefas" value={commitResult.result.subtasks_created} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button asChild><Link to="/admin/monday-parity">Ver paridade Monday vs MARI</Link></Button>
                <Button variant="outline" asChild><Link to="/admin/advisors-mapping">Resolver advisors pendentes</Link></Button>
                <Button variant="ghost" onClick={reset}>Importar outro arquivo</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: number; accent?: 'emerald' | 'amber' }) {
  const cls = accent === 'emerald' ? 'text-emerald-500' : accent === 'amber' ? 'text-amber-500' : 'text-foreground';
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${cls}`}>{value.toLocaleString('pt-BR')}</p>
      </CardContent>
    </Card>
  );
}
