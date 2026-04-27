import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Download, CheckCircle, XCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

const VALID_CATEGORIES = ['tech', 'commerce', 'industry', 'services', 'food', 'health', 'education', 'logistics', 'telecom', 'energy', 'construction', 'agro'];
const VALID_REASONS = ['retirement', 'relocation', 'new_venture', 'health', 'partnership', 'other'];

const TEMPLATE_HEADERS = [
  'titulo', 'categoria', 'descricao', 'faturamento_anual', 'lucro_anual',
  'valor_pedido', 'cidade', 'estado', 'motivo_venda', 'cep', 'bairro',
  'rua', 'ano_fundacao', 'cnpj', 'ocultar_preco', 'info_adicional',
  // Campos contábeis opcionais — alimentam o equity_score automaticamente
  'divida_total', 'caixa_disponivel', 'funcionarios', 'crescimento_yoy_pct',
];

const TEMPLATE_EXAMPLE = [
  'Padaria Premium - Centro SP', 'food',
  'Padaria com 15 anos de mercado, localizada em região nobre de São Paulo. Carteira fiel de clientes, faturamento recorrente e marca consolidada no bairro. Oportunidade única para quem deseja investir no setor alimentício.',
  1200000, 240000, 800000, 'São Paulo', 'SP', 'retirement',
  '01310-100', 'Bela Vista', 'Rua Augusta', 2010, '12.345.678/0001-90',
  'nao', '',
  // contábeis (opcionais)
  150000, 80000, 12, 18,
];

/**
 * Calcula equity_score (0-100) com a base contábil disponível.
 * Pesos: margem líquida (40), crescimento YoY (30), saúde patrimonial (20), tamanho/idade (10).
 */
function computeEquityScore(d: Record<string, any>): number {
  const revenue = Number(d.faturamento_anual) || 0;
  const profit = Number(d.lucro_anual) || 0;
  const debt = Number(d.divida_total) || 0;
  const cash = Number(d.caixa_disponivel) || 0;
  const employees = Number(d.funcionarios) || 0;
  const growth = Number(d.crescimento_yoy_pct) || 0;
  const foundationYear = Number(d.ano_fundacao) || 0;
  const ageYears = foundationYear > 1900 ? new Date().getFullYear() - foundationYear : 0;

  // Margem líquida (0–40)
  const margin = revenue > 0 ? profit / revenue : 0;
  let marginScore = 0;
  if (margin >= 0.25) marginScore = 40;
  else if (margin >= 0.15) marginScore = 32;
  else if (margin >= 0.10) marginScore = 24;
  else if (margin >= 0.05) marginScore = 14;
  else if (margin > 0) marginScore = 6;

  // Crescimento YoY (0–30)
  let growthScore = 0;
  if (growth >= 30) growthScore = 30;
  else if (growth >= 15) growthScore = 22;
  else if (growth >= 5) growthScore = 14;
  else if (growth > 0) growthScore = 6;

  // Saúde patrimonial: dívida/EBITDA proxy + caixa (0–20)
  let healthScore = 10; // base
  if (debt > 0 && profit > 0) {
    const leverage = debt / profit;
    if (leverage < 1) healthScore = 20;
    else if (leverage < 2) healthScore = 16;
    else if (leverage < 3) healthScore = 10;
    else if (leverage < 5) healthScore = 4;
    else healthScore = 0;
  } else if (debt === 0 && cash > 0) healthScore = 20;
  if (cash > revenue * 0.1) healthScore = Math.min(20, healthScore + 4);

  // Tamanho + idade (0–10)
  let sizeScore = 0;
  if (revenue >= 5_000_000) sizeScore += 4;
  else if (revenue >= 1_000_000) sizeScore += 3;
  else if (revenue >= 500_000) sizeScore += 2;
  if (ageYears >= 10) sizeScore += 4;
  else if (ageYears >= 5) sizeScore += 3;
  else if (ageYears >= 2) sizeScore += 2;
  if (employees >= 20) sizeScore += 2;
  else if (employees >= 5) sizeScore += 1;
  sizeScore = Math.min(10, sizeScore);

  return Math.max(0, Math.min(100, Math.round(marginScore + growthScore + healthScore + sizeScore)));
}

interface ParsedRow {
  data: Record<string, any>;
  errors: string[];
  rowIndex: number;
}

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function validateRow(row: Record<string, any>, idx: number): ParsedRow {
  const errors: string[] = [];
  const titulo = String(row.titulo || '').trim();
  const categoria = String(row.categoria || '').trim().toLowerCase();
  const descricao = String(row.descricao || '').trim();
  const faturamento = Number(row.faturamento_anual) || 0;
  const lucro = Number(row.lucro_anual) || 0;
  const valor = Number(row.valor_pedido) || 0;
  const cidade = String(row.cidade || '').trim();
  const estado = String(row.estado || '').trim();
  const motivo = String(row.motivo_venda || '').trim().toLowerCase();

  if (titulo.length < 10) errors.push('Título < 10 caracteres');
  if (!VALID_CATEGORIES.includes(categoria)) errors.push(`Categoria inválida: "${categoria}"`);
  if (descricao.length < 100) errors.push(`Descrição < 100 caracteres (${descricao.length})`);
  if (faturamento <= 0) errors.push('Faturamento inválido');
  if (lucro < 0) errors.push('Lucro inválido');
  if (lucro > faturamento) errors.push('Lucro > faturamento');
  if (valor <= 0) errors.push('Valor pedido inválido');
  if (!cidade) errors.push('Cidade obrigatória');
  if (!estado || estado.length < 2) errors.push('Estado obrigatório');
  if (!VALID_REASONS.includes(motivo)) errors.push(`Motivo inválido: "${motivo}"`);

  return { data: row, errors, rowIndex: idx };
}

export function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]);
  // Set column widths
  ws['!cols'] = TEMPLATE_HEADERS.map(h => ({ wch: Math.max(h.length + 2, 18) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
  XLSX.writeFile(wb, 'modelo_upload_empresas.xlsx');
}

export function BulkUploadDialog({ open, onOpenChange, onSuccess }: BulkUploadDialogProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState(false);

  const validRows = rows.filter(r => r.errors.length === 0);
  const errorRows = rows.filter(r => r.errors.length > 0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      if (json.length === 0) {
        toast.error('Planilha vazia');
        return;
      }

      const parsed = json.map((row, i) => validateRow(row, i + 2));
      setRows(parsed);
      setParsed(true);
    };
    reader.readAsBinaryString(file);
  };

  const handleUpload = async () => {
    if (!user || validRows.length === 0) return;
    setUploading(true);

    try {
      const inserts = validRows.map(r => {
        const d = r.data;
        const ocultar = String(d.ocultar_preco || '').toLowerCase();
        return {
          user_id: user.id,
          title: String(d.titulo).trim(),
          category: String(d.categoria).trim().toLowerCase(),
          description: String(d.descricao).trim(),
          annual_revenue: Number(d.faturamento_anual) || 0,
          annual_profit: Number(d.lucro_anual) || 0,
          asking_price: Number(d.valor_pedido) || 0,
          city: String(d.cidade).trim(),
          state: String(d.estado).trim().toUpperCase(),
          sale_reason: String(d.motivo_venda).trim().toLowerCase(),
          cep: d.cep ? String(d.cep).trim() : null,
          neighborhood: d.bairro ? String(d.bairro).trim() : null,
          street: d.rua ? String(d.rua).trim() : null,
          foundation_year: d.ano_fundacao ? Number(d.ano_fundacao) : null,
          cnpj: d.cnpj ? String(d.cnpj).trim() : null,
          hide_price: ocultar === 'sim' || ocultar === 'true' || ocultar === '1',
          additional_info: d.info_adicional ? String(d.info_adicional).trim() : null,
          equity_score: computeEquityScore(d),
          status: 'pending',
          plan: 'basic',
        };
      });

      const { error } = await supabase.from('listings').insert(inserts);
      if (error) throw error;

      toast.success(`${inserts.length} anúncios criados com sucesso!`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Bulk upload error:', err);
      toast.error('Erro ao enviar anúncios: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setRows([]);
    setParsed(false);
    if (fileRef.current) fileRef.current.value = '';
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Upload em Lote
          </DialogTitle>
          <DialogDescription>
            Envie uma planilha .xlsx com múltiplas empresas para cadastrar de uma vez.
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="border-2 border-dashed border-border rounded-lg p-8 w-full text-center">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Selecione um arquivo .xlsx com os dados das empresas
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="hidden"
              />
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => downloadTemplate()}>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Modelo
                </Button>
                <Button onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Arquivo
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Categorias válidas: {VALID_CATEGORIES.join(', ')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Summary */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">{validRows.length} válidas</span>
              </div>
              {errorRows.length > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-medium">{errorRows.length} com erro</span>
                </div>
              )}
              <span className="text-sm text-muted-foreground">
                Total: {rows.length} linhas
              </span>
            </div>

            {/* Error list */}
            {errorRows.length > 0 && (
              <ScrollArea className="max-h-48 border border-border rounded-lg p-3">
                <p className="text-sm font-medium text-destructive mb-2">Linhas com erro:</p>
                {errorRows.map(r => (
                  <div key={r.rowIndex} className="text-xs mb-2 pb-2 border-b border-border last:border-0">
                    <span className="font-medium">Linha {r.rowIndex}:</span>{' '}
                    <span className="text-muted-foreground">{String(r.data.titulo || '—').substring(0, 40)}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {r.errors.map((err, i) => (
                        <Badge key={i} variant="destructive" className="text-[10px]">{err}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            )}

            {/* Valid preview */}
            {validRows.length > 0 && (
              <ScrollArea className="max-h-48 border border-border rounded-lg p-3">
                <p className="text-sm font-medium text-green-600 mb-2">Empresas válidas:</p>
                {validRows.map(r => (
                  <div key={r.rowIndex} className="text-xs mb-1 flex justify-between">
                    <span>{String(r.data.titulo).substring(0, 50)}</span>
                    <span className="text-muted-foreground">{r.data.cidade}/{r.data.estado}</span>
                  </div>
                ))}
              </ScrollArea>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => { setParsed(false); setRows([]); if (fileRef.current) fileRef.current.value = ''; }}>
                Trocar Arquivo
              </Button>
              <Button
                onClick={handleUpload}
                disabled={validRows.length === 0 || uploading}
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <>Enviar {validRows.length} empresas</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
