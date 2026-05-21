import { useState } from 'react';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  useLetterTemplates,
  useUpsertLetterTemplate,
  useDeleteLetterTemplate,
  type LetterTemplate,
} from '@/hooks/useLetterTemplates';

const EMPTY: Partial<LetterTemplate> = {
  name: '',
  subject: 'Lote de cartas para impressão',
  body_html: '<p>Prezado(a) {{contact_name}},</p>\n<p>...</p>',
  signature_html: '<p>Atenciosamente,<br>{{advisor_name}}<br>{{advisor_phone}}</p>',
  is_default: false,
  is_active: true,
};

export default function LetterTemplatesPage() {
  const { toast } = useToast();
  const { data: templates, isLoading } = useLetterTemplates(true);
  const upsert = useUpsertLetterTemplate();
  const del = useDeleteLetterTemplate();

  const [editing, setEditing] = useState<Partial<LetterTemplate> | null>(null);

  function preview(html: string) {
    const map: Record<string, string> = {
      '{{contact_name}}': 'João da Silva',
      '{{company_name}}': 'ACME Indústria Ltda',
      '{{cnpj}}': '12.345.678/0001-99',
      '{{city}}': 'Porto Alegre/RS',
      '{{advisor_name}}': 'Pablo Vispe',
      '{{advisor_phone}}': '(51) 99233-8258',
    };
    return Object.entries(map).reduce((acc, [k, v]) => acc.split(k).join(v), html);
  }

  async function handleSave() {
    if (!editing?.name || !editing?.body_html) {
      toast({ title: 'Preencha nome e corpo', variant: 'destructive' });
      return;
    }
    await upsert.mutateAsync(editing as LetterTemplate);
    toast({ title: 'Template salvo' });
    setEditing(null);
  }

  return (
    <div className="p-4 lg:p-6 bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Modelos de carta</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Templates usados na geração de cartas em lote para a gráfica.</p>
        </div>
        <Button
          size="sm"
          onClick={() => setEditing({ ...EMPTY })}
          className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 font-semibold"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo modelo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-zinc-600" /></div>
      ) : (
        <div className="grid gap-3">
          {templates?.length === 0 && (
            <Card className="!bg-slate-900/60 backdrop-blur-md border-zinc-800 p-8 text-center text-sm text-zinc-500">
              Nenhum modelo cadastrado.
            </Card>
          )}
          {templates?.map((t) => (
            <Card key={t.id} className="!bg-slate-900/60 backdrop-blur-md border-zinc-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-zinc-100 break-words">{t.name}</h3>
                    {t.is_default && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D9F564]/20 text-[#D9F564] font-medium">PADRÃO</span>
                    )}
                    {!t.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">INATIVO</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 break-words">{t.subject}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="outline"
                    onClick={() => setEditing(t)}
                    className="h-8 bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800"
                  >Editar</Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => {
                      if (confirm('Excluir este modelo?')) void del.mutate(t.id);
                    }}
                    className="h-8 bg-transparent border-zinc-700 text-red-400 hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <Card className="!bg-zinc-950 border-zinc-800 w-full max-w-4xl max-h-[90vh] overflow-auto p-5">
            <h2 className="text-lg font-semibold mb-4">{editing.id ? 'Editar modelo' : 'Novo modelo'}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400">Nome</label>
                  <Input
                    value={editing.name ?? ''}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Assunto do e-mail (à gráfica)</label>
                  <Input
                    value={editing.subject ?? ''}
                    onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Corpo da carta (HTML)</label>
                  <Textarea
                    rows={10}
                    value={editing.body_html ?? ''}
                    onChange={(e) => setEditing({ ...editing, body_html: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Assinatura (HTML)</label>
                  <Textarea
                    rows={4}
                    value={editing.signature_html ?? ''}
                    onChange={(e) => setEditing({ ...editing, signature_html: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 mt-1 font-mono text-xs"
                  />
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!editing.is_default}
                      onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
                    />
                    Modelo padrão
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editing.is_active ?? true}
                      onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    />
                    Ativo
                  </label>
                </div>
                <div className="text-[10px] text-zinc-500">
                  Placeholders: <code>{'{{contact_name}}'}</code>, <code>{'{{company_name}}'}</code>, <code>{'{{cnpj}}'}</code>, <code>{'{{city}}'}</code>, <code>{'{{advisor_name}}'}</code>, <code>{'{{advisor_phone}}'}</code>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400">Prévia</label>
                <div className="bg-white text-zinc-900 rounded p-4 mt-1 min-h-[320px] text-xs leading-relaxed overflow-auto max-h-[60vh]">
                  <div className="prose prose-sm max-w-none break-words" dangerouslySetInnerHTML={{ __html: preview(editing.body_html ?? '') }} />
                  {editing.signature_html && (
                    <div className="mt-4 pt-3 border-t border-zinc-200 prose prose-sm max-w-none break-words" dangerouslySetInnerHTML={{ __html: preview(editing.signature_html) }} />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <Button
                variant="outline"
                onClick={() => setEditing(null)}
                className="bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800"
              >Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={upsert.isPending}
                className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 font-semibold"
              >
                {upsert.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
