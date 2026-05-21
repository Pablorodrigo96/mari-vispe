import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Download, Mail, AlertTriangle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLetterBatches, getSignedLetterUrl, type LetterBatch } from '@/hooks/useLetterBatches';
import { useLetterTemplates } from '@/hooks/useLetterTemplates';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<LetterBatch['status'], string> = {
  generating: 'bg-amber-900/40 text-amber-300',
  sent: 'bg-emerald-900/40 text-emerald-300',
  failed: 'bg-red-900/40 text-red-300',
};
const STATUS_LABEL: Record<LetterBatch['status'], string> = {
  generating: 'Gerando',
  sent: 'Enviado',
  failed: 'Falhou',
};

const PAGE_SIZE = 20;
type StatusFilter = 'all' | LetterBatch['status'];
type RangeFilter = 'all' | '7' | '30' | '90';

export default function LetterHistoryPage() {
  const { toast } = useToast();
  const { data, isLoading } = useLetterBatches();
  const { data: templates } = useLetterTemplates(true);
  const [params, setParams] = useSearchParams();
  const highlightBatchId = params.get('batch');

  const [status, setStatus] = useState<StatusFilter>('all');
  const [range, setRange] = useState<RangeFilter>('all');
  const [page, setPage] = useState(1);

  // Scroll to highlighted batch from query string
  useEffect(() => {
    if (!highlightBatchId) return;
    const el = document.getElementById(`batch-${highlightBatchId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightBatchId, data]);

  const tplName = useMemo(() => {
    const map = new Map<string, string>();
    templates?.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [templates]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const cutoff = range === 'all' ? 0 : Date.now() - Number(range) * 24 * 60 * 60 * 1000;
    return data.filter((b) => {
      if (status !== 'all' && b.status !== status) return false;
      if (cutoff && new Date(b.created_at).getTime() < cutoff) return false;
      return true;
    });
  }, [data, status, range]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [status, range]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs (calculados sobre TODOS os lotes, não só os filtrados)
  const kpis = useMemo(() => {
    if (!data) return { thisMonth: 0, totalCards: 0, lastSentLabel: '—' };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisMonth = data.filter((b) => new Date(b.created_at).getTime() >= startOfMonth).length;
    const totalCards = data.reduce((sum, b) => sum + (b.total_contacts ?? 0), 0);
    const lastSent = data.find((b) => b.status === 'sent');
    const lastSentLabel = lastSent ? new Date(lastSent.created_at).toLocaleDateString('pt-BR') : '—';
    return { thisMonth, totalCards, lastSentLabel };
  }, [data]);

  async function download(path: string | null, label: string) {
    if (!path) return;
    try {
      const url = await getSignedLetterUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast({ title: `Falha ao baixar ${label}`, description: (e as Error).message, variant: 'destructive' });
    }
  }

  function clearHighlight() {
    const np = new URLSearchParams(params);
    np.delete('batch');
    setParams(np, { replace: true });
  }

  return (
    <div className="p-4 lg:p-6 bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Histórico de lotes de cartas</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Cartas físicas geradas e enviadas para a gráfica parceira.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-4">
        <Card className="!bg-slate-900/60 backdrop-blur-md border-zinc-800 p-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Lotes no mês</div>
          <div className="text-2xl font-semibold text-zinc-100 tabular-nums mt-1">{kpis.thisMonth}</div>
        </Card>
        <Card className="!bg-slate-900/60 backdrop-blur-md border-zinc-800 p-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Cartas geradas</div>
          <div className="text-2xl font-semibold text-zinc-100 tabular-nums mt-1">{kpis.totalCards}</div>
        </Card>
        <Card className="!bg-slate-900/60 backdrop-blur-md border-zinc-800 p-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Última remessa</div>
          <div className="text-lg font-semibold text-zinc-100 tabular-nums mt-1 break-words">{kpis.lastSentLabel}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="h-8 w-[140px] bg-zinc-900 border-zinc-800 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="dark bg-zinc-950 border-zinc-800">
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="generating">Gerando</SelectItem>
            <SelectItem value="sent">Enviado</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={(v) => setRange(v as RangeFilter)}>
          <SelectTrigger className="h-8 w-[140px] bg-zinc-900 border-zinc-800 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="dark bg-zinc-950 border-zinc-800">
            <SelectItem value="all">Todo período</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-zinc-500 ml-1">
          {filtered.length} de {data?.length ?? 0} lote(s)
        </span>
        {highlightBatchId && (
          <button onClick={clearHighlight} className="ml-auto text-xs text-zinc-400 underline hover:text-zinc-200">
            Limpar destaque
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-zinc-600" /></div>
      ) : filtered.length === 0 ? (
        <Card className="!bg-slate-900/60 backdrop-blur-md border-zinc-800 p-8 text-center text-sm text-zinc-500">
          {(data?.length ?? 0) === 0
            ? <>Nenhum lote gerado ainda. Vá em <strong>Pipeline → Prospecção</strong> para começar.</>
            : 'Nenhum lote corresponde aos filtros selecionados.'}
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {pageRows.map((b) => {
              const isHighlight = b.id === highlightBatchId;
              return (
                <Card
                  key={b.id}
                  id={`batch-${b.id}`}
                  className={cn(
                    '!bg-slate-900/60 backdrop-blur-md border-zinc-800 p-4 transition-all',
                    isHighlight && 'ring-2 ring-[#D9F564] border-[#D9F564]/40',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-500" />
                        <span className="font-medium text-zinc-100 tabular-nums">{b.total_contacts} carta(s)</span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_BADGE[b.status])}>
                          {STATUS_LABEL[b.status]}
                        </span>
                        {b.template_id && tplName.get(b.template_id) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 break-words">
                            {tplName.get(b.template_id)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1.5 flex flex-wrap gap-3">
                        <span>{new Date(b.created_at).toLocaleString('pt-BR')}</span>
                        {b.grafica_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {b.grafica_email}
                          </span>
                        )}
                      </div>
                      {b.error_message && (
                        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-300 bg-amber-950/30 border border-amber-900/50 px-2 py-1.5 rounded break-words">
                          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                          <span>{b.error_message}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm" variant="outline"
                        onClick={() => download(b.pdf_storage_path, 'PDF')}
                        disabled={!b.pdf_storage_path}
                        className="h-8 bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" /> PDF
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => download(b.csv_storage_path, 'CSV')}
                        disabled={!b.csv_storage_path}
                        className="h-8 bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                size="sm" variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-zinc-400 tabular-nums">
                Página {page} de {totalPages}
              </span>
              <Button
                size="sm" variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
