import { Loader2, Download, Mail, AlertTriangle, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLetterBatches, getSignedLetterUrl, type LetterBatch } from '@/hooks/useLetterBatches';
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

export default function LetterHistoryPage() {
  const { toast } = useToast();
  const { data, isLoading } = useLetterBatches();

  async function download(path: string | null, label: string) {
    if (!path) return;
    try {
      const url = await getSignedLetterUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast({ title: `Falha ao baixar ${label}`, description: (e as Error).message, variant: 'destructive' });
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Histórico de lotes de cartas</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Cartas físicas geradas e enviadas para a gráfica parceira.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-zinc-600" /></div>
      ) : data?.length === 0 ? (
        <Card className="!bg-slate-900/60 backdrop-blur-md border-zinc-800 p-8 text-center text-sm text-zinc-500">
          Nenhum lote gerado ainda. Vá em <strong>Pipeline → Prospecção</strong> para começar.
        </Card>
      ) : (
        <div className="grid gap-3">
          {data?.map((b) => (
            <Card key={b.id} className="!bg-slate-900/60 backdrop-blur-md border-zinc-800 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="h-4 w-4 text-zinc-500" />
                    <span className="font-medium text-zinc-100 tabular-nums">{b.total_contacts} carta(s)</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_BADGE[b.status])}>
                      {STATUS_LABEL[b.status]}
                    </span>
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
                    <div className="mt-2 flex items-start gap-1.5 text-[11px] text-red-300 bg-red-950/30 border border-red-900/50 px-2 py-1.5 rounded break-words">
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
          ))}
        </div>
      )}
    </div>
  );
}
