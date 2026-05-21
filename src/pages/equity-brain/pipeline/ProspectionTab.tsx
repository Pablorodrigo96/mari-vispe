import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  useProspectContacts,
  useUpdateProspectStatus,
  PROSPECT_STATUS_LABELS,
  type ProspectFilters,
  type ProspectStatus,
  type ProspectSide,
  type ProspectContact,
} from '@/hooks/useProspectContacts';
import { NewProspectModal } from '@/components/pipeline/NewProspectModal';
import { SendLettersDialog } from '@/components/pipeline/SendLettersDialog';
import { useContactLastLetter } from '@/hooks/useContactLastLetter';
import { Mail } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from 'react-router-dom';

function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return 'hoje';
  if (days < 30) return `${days}d`;
  return d.toLocaleDateString('pt-BR');
}

const STATUS_BADGE: Partial<Record<ProspectStatus, string>> = {
  new: 'bg-zinc-800 text-zinc-300',
  letter_queued: 'bg-amber-900/40 text-amber-300',
  letter_sent: 'bg-sky-900/40 text-sky-300',
  letter_delivered: 'bg-sky-900/60 text-sky-200',
  contacted: 'bg-[#D9F564]/20 text-[#D9F564]',
  meeting_scheduled: 'bg-[#D9F564]/30 text-[#D9F564]',
  mandate_signed: 'bg-emerald-900/40 text-emerald-300',
  no_response: 'bg-zinc-900 text-zinc-500',
  declined: 'bg-red-900/40 text-red-300',
  archived: 'bg-zinc-900 text-zinc-600',
};

function LetterBadge({ batchId, sentAt }: { batchId: string; sentAt: string }) {
  const d = new Date(sentAt);
  const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={`/equity-brain/cartas/historico?batch=${batchId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-900/40 text-sky-300 hover:bg-sky-900/60 transition-colors"
          >
            <Mail className="h-2.5 w-2.5" /> {label}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Carta enviada em {d.toLocaleDateString('pt-BR')} · clique para ver o lote
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function ProspectionTab() {
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [lettersOpen, setLettersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastClicked, setLastClicked] = useState<string | null>(null);

  const filters: ProspectFilters = useMemo(() => ({
    side: (params.get('side') as ProspectSide) || 'all',
    status: (params.get('status') as ProspectStatus) || 'all',
    sector: params.get('sector') || '',
    search: params.get('q') || '',
  }), [params]);

  const setFilter = (k: string, v: string) => {
    const np = new URLSearchParams(params);
    if (!v || v === 'all') np.delete(k);
    else np.set(k, v);
    setParams(np, { replace: true });
  };

  const { data, isLoading } = useProspectContacts(filters, 0);
  const rows = data?.rows ?? [];
  const updateStatus = useUpdateProspectStatus();
  const contactIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const { data: lastLetters } = useContactLastLetter(contactIds);

  function toggleRow(id: string, e: React.MouseEvent) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && lastClicked) {
        const ids = rows.map((r) => r.id);
        const a = ids.indexOf(lastClicked);
        const b = ids.indexOf(id);
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) next.add(ids[i]);
        }
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastClicked(id);
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );
  }

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const missingAddress = selectedRows.filter((r) => !r.postal_address || !r.postal_zipcode);

  function handleGenerateLetters() {
    if (selectedRows.length === 0) return;
    if (selectedRows.length > 200) {
      toast({
        title: 'Máximo 200 cartas por lote',
        description: 'Reduza a seleção e tente novamente.',
        variant: 'destructive',
      });
      return;
    }
    if (missingAddress.length > 0) {
      toast({
        title: `${missingAddress.length} contato(s) sem endereço postal`,
        description: 'Edite os contatos destacados antes de gerar o lote.',
        variant: 'destructive',
      });
      return;
    }
    setLettersOpen(true);
  }

  async function handleBulkStatus(s: ProspectStatus) {
    await updateStatus.mutateAsync({ ids: [...selected], status: s });
    toast({ title: `${selected.size} contato(s) atualizados` });
    setSelected(new Set());
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Filtros */}
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950 px-4 lg:px-6 py-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-md">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
          <Input
            placeholder="Buscar por nome, empresa, cidade ou CNPJ"
            value={filters.search ?? ''}
            onChange={(e) => setFilter('q', e.target.value)}
            className="pl-8 h-8 bg-zinc-900 border-zinc-800 text-xs"
          />
        </div>

        <Select value={filters.side ?? 'all'} onValueChange={(v) => setFilter('side', v)}>
          <SelectTrigger className="h-8 w-[110px] bg-zinc-900 border-zinc-800 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="dark bg-zinc-950 border-zinc-800">
            <SelectItem value="all">Todos lados</SelectItem>
            <SelectItem value="sell">Sell-side</SelectItem>
            <SelectItem value="buy">Buy-side</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status ?? 'all'} onValueChange={(v) => setFilter('status', v)}>
          <SelectTrigger className="h-8 w-[150px] bg-zinc-900 border-zinc-800 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="dark bg-zinc-950 border-zinc-800">
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(PROSPECT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Setor"
          value={filters.sector ?? ''}
          onChange={(e) => setFilter('sector', e.target.value)}
          className="h-8 w-[140px] bg-zinc-900 border-zinc-800 text-xs"
        />

        <div className="ml-auto">
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-8 bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo contato
          </Button>
        </div>
      </div>

      {/* Tabela / Lista */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 text-sm gap-3">
            <p>Nenhum contato em prospecção. Cadastre o primeiro.</p>
            <Button size="sm" onClick={() => setModalOpen(true)} className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 font-semibold">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Novo contato
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-xs">
              <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800 text-zinc-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="w-8 px-3 py-2">
                    <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} />
                  </th>
                  <th className="text-left px-2 py-2">Contato</th>
                  <th className="text-left px-2 py-2">Empresa</th>
                  <th className="text-left px-2 py-2">Cidade/UF</th>
                  <th className="text-left px-2 py-2">Setor</th>
                  <th className="text-left px-2 py-2">Lado</th>
                  <th className="text-left px-2 py-2">Status</th>
                  <th className="text-left px-2 py-2 tabular-nums">Último</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isSel = selected.has(r.id);
                  const missingAddr = isSel && (!r.postal_address || !r.postal_zipcode);
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        'border-b border-zinc-900 h-9 hover:bg-zinc-900/50 transition-colors cursor-pointer',
                        isSel && 'bg-zinc-900/70',
                        missingAddr && 'bg-amber-950/30 hover:bg-amber-950/40',
                      )}
                      onClick={(e) => toggleRow(r.id, e)}
                    >
                      <td className="px-3 py-2"><input type="checkbox" checked={isSel} onChange={() => {}} /></td>
                      <td className="px-2 py-2 text-zinc-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{r.contact_name}</span>
                          {lastLetters?.get(r.id) && (
                            <LetterBadge batchId={lastLetters.get(r.id)!.batch_id} sentAt={lastLetters.get(r.id)!.sent_at} />
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-zinc-300">{r.company_name}</td>
                      <td className="px-2 py-2 text-zinc-400">{r.city}/{r.state}</td>
                      <td className="px-2 py-2 text-zinc-400">{r.sector}</td>
                      <td className="px-2 py-2 text-zinc-400 uppercase">{r.side}</td>
                      <td className="px-2 py-2">
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_BADGE[r.status] ?? 'bg-zinc-800 text-zinc-300')}>
                          {PROSPECT_STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-zinc-500 tabular-nums">{fmtDate(r.last_contact_at ?? r.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-zinc-900">
              {rows.map((r: ProspectContact) => {
                const isSel = selected.has(r.id);
                const missingAddr = isSel && (!r.postal_address || !r.postal_zipcode);
                return (
                  <div
                    key={r.id}
                    onClick={(e) => toggleRow(r.id, e)}
                    className={cn('p-3 active:bg-zinc-900', isSel && 'bg-zinc-900/70', missingAddr && 'bg-amber-950/30')}
                  >
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={isSel} onChange={() => {}} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-zinc-100 text-sm break-words flex items-center gap-1.5 flex-wrap">
                          <span>{r.contact_name}</span>
                          {lastLetters?.get(r.id) && (
                            <LetterBadge batchId={lastLetters.get(r.id)!.batch_id} sentAt={lastLetters.get(r.id)!.sent_at} />
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 break-words">{r.company_name}</div>
                        <div className="text-[11px] text-zinc-500 mt-1 flex flex-wrap gap-2">
                          <span>{r.city}/{r.state}</span>
                          <span>{r.sector}</span>
                          <span className="uppercase">{r.side}</span>
                        </div>
                        <div className="mt-1.5">
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_BADGE[r.status] ?? 'bg-zinc-800 text-zinc-300')}>
                            {PROSPECT_STATUS_LABELS[r.status]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur px-4 lg:px-6 py-2.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-100 font-medium tabular-nums">{selected.size} selecionado(s)</span>
          {missingAddress.length > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="h-3 w-3" /> {missingAddress.length} sem endereço
            </span>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <Select onValueChange={(v) => handleBulkStatus(v as ProspectStatus)}>
              <SelectTrigger className="h-8 w-[150px] bg-zinc-900 border-zinc-800 text-xs"><SelectValue placeholder="Mudar status" /></SelectTrigger>
              <SelectContent className="dark bg-zinc-950 border-zinc-800">
                {Object.entries(PROSPECT_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleGenerateLetters}
              disabled={missingAddress.length > 0 || updateStatus.isPending}
              className="h-8 bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 font-semibold disabled:opacity-40"
            >
              Gerar carta em lote
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(new Set())}
              className="h-8 bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800"
            >
              Limpar
            </Button>
          </div>
        </div>
      )}

      <NewProspectModal open={modalOpen} onOpenChange={setModalOpen} />
      <SendLettersDialog
        open={lettersOpen}
        onOpenChange={setLettersOpen}
        contacts={selectedRows}
        onComplete={() => setSelected(new Set())}
      />
    </div>
  );
}
