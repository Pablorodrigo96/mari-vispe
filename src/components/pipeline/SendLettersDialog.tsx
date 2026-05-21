import { useMemo, useState } from 'react';
import { Loader2, FileText, Mail, AlertTriangle, ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLetterTemplates } from '@/hooks/useLetterTemplates';
import { useSendLettersBatch, usePreviewLetter } from '@/hooks/useLetterBatches';
import { useToast } from '@/hooks/use-toast';
import type { ProspectContact } from '@/hooks/useProspectContacts';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: ProspectContact[];
  /** Called with valid contact IDs after the user chooses to drop incomplete ones. */
  onFilterIncomplete?: (validIds: string[]) => void;
  onComplete?: () => void;
}

const CEP_REGEX = /^\d{5}-?\d{3}$/;

function validateContact(c: ProspectContact): string[] {
  const errs: string[] = [];
  if (!c.postal_address || c.postal_address.trim().length < 5) errs.push('endereço');
  if (!c.postal_zipcode || !CEP_REGEX.test(c.postal_zipcode.trim())) errs.push('CEP');
  if (!c.city) errs.push('cidade');
  if (!c.state) errs.push('UF');
  return errs;
}

export function SendLettersDialog({ open, onOpenChange, contacts, onFilterIncomplete, onComplete }: Props) {
  const { toast } = useToast();
  const { data: templates, isLoading: loadingTpls } = useLetterTemplates(false);
  const send = useSendLettersBatch();
  const previewMut = usePreviewLetter();

  const defaultTpl = templates?.find((t) => t.is_default) ?? templates?.[0];
  const [templateId, setTemplateId] = useState<string | undefined>(defaultTpl?.id);
  const effectiveTplId = templateId ?? defaultTpl?.id;
  const selectedTpl = templates?.find((t) => t.id === effectiveTplId);

  const [pageIdx, setPageIdx] = useState(0);
  const [showMissing, setShowMissing] = useState(false);

  const validations = useMemo(
    () => contacts.map((c) => ({ contact: c, errs: validateContact(c) })),
    [contacts],
  );
  const missing = validations.filter((v) => v.errs.length > 0);
  const validIds = validations.filter((v) => v.errs.length === 0).map((v) => v.contact.id);

  const tooMany = contacts.length > 200;
  const canSend = !!effectiveTplId && contacts.length > 0 && missing.length === 0 && !tooMany;

  const current = contacts[Math.min(pageIdx, Math.max(0, contacts.length - 1))];

  function rawPreview(c: ProspectContact, html: string) {
    return html
      .split('{{contact_name}}').join(c.contact_name)
      .split('{{company_name}}').join(c.company_name)
      .split('{{cnpj}}').join(c.cnpj ?? '__CNPJ__')
      .split('{{city}}').join(`${c.city}/${c.state}`)
      .split('{{advisor_name}}').join('Equipe mari')
      .split('{{advisor_phone}}').join('__TELEFONE__');
  }

  function highlightPlaceholders(html: string) {
    return html.replace(
      /(__CNPJ__|__TELEFONE__)/g,
      '<span style="background:#FEF3C7;color:#92400E;padding:0 4px;border-radius:3px;font-size:11px;">⚠ $1</span>',
    );
  }

  async function handleSend() {
    if (!effectiveTplId) return;
    try {
      const res = await send.mutateAsync({
        contactIds: contacts.map((c) => c.id),
        templateId: effectiveTplId,
      });
      toast({
        title: 'Lote gerado',
        description: res.email_sent
          ? `${contacts.length} cartas enviadas à gráfica.`
          : `${contacts.length} cartas geradas. Baixe o PDF em Cartas → Histórico.`,
      });
      onOpenChange(false);
      onComplete?.();
    } catch (e) {
      toast({
        title: 'Falha ao gerar lote',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  async function handlePreviewPdf() {
    if (!effectiveTplId || !current) return;
    try {
      const { pdf_base64 } = await previewMut.mutateAsync({
        contactId: current.id,
        templateId: effectiveTplId,
      });
      const blob = new Blob(
        [Uint8Array.from(atob(pdf_base64), (c) => c.charCodeAt(0))],
        { type: 'application/pdf' },
      );
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast({ title: 'Falha ao gerar prévia', description: (e as Error).message, variant: 'destructive' });
    }
  }

  function handleDropIncomplete() {
    onFilterIncomplete?.(validIds);
    setShowMissing(false);
    toast({ title: `${missing.length} contato(s) removidos da seleção` });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark bg-zinc-950 border-zinc-800 text-zinc-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Gerar lote de cartas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <FileText className="h-3.5 w-3.5" />
            <span className="tabular-nums text-zinc-100 font-medium">{contacts.length}</span> contato(s) selecionado(s)
          </div>

          {tooMany && (
            <div className="flex items-center gap-2 text-xs bg-red-950/40 border border-red-900/60 text-red-300 px-3 py-2 rounded">
              <AlertTriangle className="h-3.5 w-3.5" /> Máximo 200 cartas por lote. Reduza a seleção.
            </div>
          )}

          {missing.length > 0 && (
            <div className="text-xs bg-amber-950/40 border border-amber-900/60 text-amber-300 px-3 py-2 rounded">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span><strong>{missing.length}</strong> contato(s) com endereço incompleto.</span>
                <button
                  onClick={() => setShowMissing((s) => !s)}
                  className="ml-auto underline hover:text-amber-200"
                >
                  {showMissing ? 'Ocultar' : 'Ver detalhes'}
                </button>
              </div>
              {showMissing && (
                <ul className="mt-2 space-y-1 max-h-40 overflow-auto pl-5 list-disc text-amber-200">
                  {missing.map((m) => (
                    <li key={m.contact.id} className="break-words">
                      <span className="font-medium">{m.contact.contact_name}</span>{' '}
                      <span className="text-amber-400/80">({m.contact.company_name})</span>
                      {' · falta: '}<span className="text-amber-100">{m.errs.join(', ')}</span>
                    </li>
                  ))}
                </ul>
              )}
              {validIds.length > 0 && (
                <button
                  onClick={handleDropIncomplete}
                  className="mt-2 flex items-center gap-1 text-amber-200 hover:text-amber-100 underline"
                >
                  <X className="h-3 w-3" />
                  Remover incompletos e manter só os {validIds.length} válidos
                </button>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Modelo de carta</label>
            <Select value={effectiveTplId} onValueChange={setTemplateId} disabled={loadingTpls}>
              <SelectTrigger className="h-9 bg-zinc-900 border-zinc-800 text-sm"><SelectValue placeholder="Selecione um modelo" /></SelectTrigger>
              <SelectContent className="dark bg-zinc-950 border-zinc-800">
                {templates?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}{t.is_default ? ' · padrão' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTpl && current && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-400">Prévia · {pageIdx + 1} de {contacts.length}</label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button" size="sm" variant="outline"
                    onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
                    disabled={pageIdx === 0}
                    className="h-7 px-2 bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button" size="sm" variant="outline"
                    onClick={() => setPageIdx((i) => Math.min(contacts.length - 1, i + 1))}
                    disabled={pageIdx >= contacts.length - 1}
                    className="h-7 px-2 bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button" size="sm" variant="outline"
                    onClick={handlePreviewPdf}
                    disabled={previewMut.isPending || !effectiveTplId}
                    className="h-7 px-2 bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800 ml-1"
                  >
                    {previewMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                    PDF
                  </Button>
                </div>
              </div>
              <div className="bg-white text-zinc-900 rounded p-4 max-h-64 overflow-auto text-xs leading-relaxed">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 break-words">
                  Destinatário: <strong>{current.contact_name}</strong> — {current.company_name}
                </div>
                <div
                  className="prose prose-sm max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: highlightPlaceholders(rawPreview(current, selectedTpl.body_html)) }}
                />
                {selectedTpl.signature_html && (
                  <div className="mt-4 pt-3 border-t border-zinc-200">
                    <div
                      className="prose prose-sm max-w-none break-words"
                      dangerouslySetInnerHTML={{ __html: highlightPlaceholders(rawPreview(current, selectedTpl.signature_html)) }}
                    />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-zinc-500">
                Trechos destacados em amarelo indicam dados faltando no contato (serão impressos em branco).
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 text-[11px] text-zinc-500 bg-zinc-900/60 border border-zinc-800 px-3 py-2 rounded">
            <Mail className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              Será gerado <strong className="text-zinc-300">1 PDF consolidado</strong> (uma página por contato) + planilha CSV de etiquetas.
              Ambos são enviados à gráfica configurada pelo admin.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend || send.isPending}
            className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 font-semibold"
          >
            {send.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando…</>
            ) : (
              `Gerar ${contacts.length} carta(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
