import { useEffect, useState } from 'react';
import { Loader2, Save, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type Cfg = {
  grafica_email: string;
  grafica_cc: string;
  letter_sender_name: string;
  letter_sender_address: string;
};

const KEYS: (keyof Cfg)[] = [
  'grafica_email',
  'grafica_cc',
  'letter_sender_name',
  'letter_sender_address',
];

const DESCRIPTIONS: Record<keyof Cfg, string> = {
  grafica_email: 'E-mail da gráfica que recebe o PDF do lote',
  grafica_cc: 'CC adicional (separe por vírgula). Opcional.',
  letter_sender_name: 'Nome do remetente no cabeçalho da carta',
  letter_sender_address: 'Endereço completo do remetente (rodapé/envelope)',
};

export default function AdminLettersSettings() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<Cfg>({
    grafica_email: '',
    grafica_cc: '',
    letter_sender_name: 'mari · Vispe Group',
    letter_sender_address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('api_settings')
        .select('key,value')
        .in('key', KEYS);
      if (data) {
        setCfg((prev) => {
          const next = { ...prev };
          data.forEach((r: any) => {
            if (KEYS.includes(r.key)) (next as any)[r.key] = r.value ?? '';
          });
          return next;
        });
      }
      setLoading(false);
    })();
  }, []);

  function update<K extends keyof Cfg>(k: K, v: string) {
    setCfg((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    if (!cfg.grafica_email.trim()) {
      toast({ title: 'E-mail da gráfica obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const rows = KEYS.map((k) => ({
        key: k,
        value: cfg[k] ?? '',
        description: DESCRIPTIONS[k],
      }));
      const { error } = await (supabase as any)
        .from('api_settings')
        .upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      toast({ title: 'Configurações salvas' });
    } catch (e) {
      toast({
        title: 'Falha ao salvar',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 lg:px-8 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          <Link to="/admin" className="hover:text-zinc-300">Admin</Link>
          <span>·</span>
          <span className="text-zinc-300">Gráfica & Cartas</span>
        </div>

        <h1 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <Mail className="h-4 w-4 text-[#D9F564]" />
          Cartas em lote — Gráfica
        </h1>
        <p className="text-xs text-zinc-500 mb-6 break-words">
          E-mail e remetente usados pelo lote de cartas (PDF consolidado + CSV de etiquetas) enviado à gráfica.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <div className="space-y-5 !bg-slate-900/60 backdrop-blur-md border border-zinc-800 rounded-lg p-5">
            <Field label="E-mail da gráfica *" desc={DESCRIPTIONS.grafica_email}>
              <Input
                type="email"
                value={cfg.grafica_email}
                onChange={(e) => update('grafica_email', e.target.value)}
                placeholder="contato@graficaexemplo.com.br"
                className="bg-zinc-950 border-zinc-800"
              />
            </Field>

            <Field label="CC" desc={DESCRIPTIONS.grafica_cc}>
              <Input
                value={cfg.grafica_cc}
                onChange={(e) => update('grafica_cc', e.target.value)}
                placeholder="copia1@empresa.com, copia2@empresa.com"
                className="bg-zinc-950 border-zinc-800"
              />
            </Field>

            <Field label="Nome do remetente" desc={DESCRIPTIONS.letter_sender_name}>
              <Input
                value={cfg.letter_sender_name}
                onChange={(e) => update('letter_sender_name', e.target.value)}
                className="bg-zinc-950 border-zinc-800"
              />
            </Field>

            <Field label="Endereço do remetente" desc={DESCRIPTIONS.letter_sender_address}>
              <Textarea
                value={cfg.letter_sender_address}
                onChange={(e) => update('letter_sender_address', e.target.value)}
                rows={3}
                placeholder="Rua Exemplo, 123 · Sala 45 · CEP 90000-000 · Porto Alegre/RS"
                className="bg-zinc-950 border-zinc-800"
              />
            </Field>

            <div className="flex justify-end pt-2">
              <Button
                onClick={save}
                disabled={saving}
                className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 font-semibold"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>

            <p className="text-[11px] text-zinc-500 break-words pt-2 border-t border-zinc-800">
              Enquanto o domínio de e-mail da plataforma não estiver conectado, o lote ainda é gerado e o PDF/CSV ficam disponíveis em{' '}
              <Link to="/equity-brain/cartas/historico" className="underline text-zinc-300">Cartas → Histórico</Link>. O envio automático à gráfica passa a funcionar assim que o e-mail for habilitado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-300">{label}</Label>
      {children}
      <p className="text-[11px] text-zinc-500 break-words">{desc}</p>
    </div>
  );
}
