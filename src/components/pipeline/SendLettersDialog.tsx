import { useState } from 'react';
import { Loader2, FileText, Mail, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLetterTemplates } from '@/hooks/useLetterTemplates';
import { useSendLettersBatch } from '@/hooks/useLetterBatches';
import { useToast } from '@/hooks/use-toast';
import type { ProspectContact } from '@/hooks/useProspectContacts';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: ProspectContact[];
  onComplete?: () => void;
}

export function SendLettersDialog({ open, onOpenChange, contacts, onComplete }: Props) {
  const { toast } = useToast();
  const { data: templates, isLoading: loadingTpls } = useLetterTemplates(false);
  const send = useSendLettersBatch();

  const defaultTpl = templates?.find((t) => t.is_default) ?? templates?.[0];
  const [templateId, setTemplateId] = useState<string | undefined>(defaultTpl?.id);
  const effectiveTplId = templateId ?? defaultTpl?.id;
  const selectedTpl = templates?.find((t) => t.id === effectiveTplId);

  const missing = contacts.filter((c) => !c.postal_address || !c.postal_zipcode);
  const tooMany = contacts.length > 200;
  const canSend = !!effectiveTplId && contacts.length > 0 && missing.length === 0 && !tooMany;

  function previewFor(c: ProspectContact, html: string) {
    return html
      .replaceAll('{{contact_name}}', c.contact_name)
      .replaceAll('{{company_name}}', c.company_name)
      .replaceAll('{{cnpj}}', c.cnpj ?? '—')
      .replaceAll('{{city}}', `${c.city}/${c.state}`)
      .replaceAll('{{advisor_name}}', 'Equipe mari')
      .replaceAll('{{advisor_phone}}', '');
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
          : `${contacts.length} cartas geradas. E-mail à gráfica falhou — baixe o PDF no histórico.`,
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

  const firstContact = contacts[0];

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
            <div className="flex items-center gap-2 text-xs bg-amber-950/40 border border-amber-900/60 text-amber-300 px-3 py-2 rounded">
              <AlertTriangle className="h-3.5 w-3.5" /> {missing.length} contato(s) sem endereço postal completo.
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

          {selectedTpl && firstContact && (
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Prévia (1ª carta)</label>
              <div className="bg-white text-zinc-900 rounded p-4 max-h-64 overflow-auto text-xs leading-relaxed">
                <div
                  className="prose prose-sm max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: previewFor(firstContact, selectedTpl.body_html) }}
                />
                {selectedTpl.signature_html && (
                  <div className="mt-4 pt-3 border-t border-zinc-200">
                    <div
                      className="prose prose-sm max-w-none break-words"
                      dangerouslySetInnerHTML={{ __html: previewFor(firstContact, selectedTpl.signature_html) }}
                    />
                  </div>
                )}
              </div>
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
