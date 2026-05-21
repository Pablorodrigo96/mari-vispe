import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProspectContact, PROSPECT_SOURCE_LABELS, type ProspectSide, type ProspectSource } from '@/hooks/useProspectContacts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function validCnpj(cnpj: string): boolean {
  const c = cnpj.replace(/\D/g, '');
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (slice: string, weights: number[]) => {
    const sum = slice.split('').reduce((acc, d, i) => acc + parseInt(d, 10) * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  return calc(c.slice(0,12), w1) === parseInt(c[12], 10) && calc(c.slice(0,13), w2) === parseInt(c[13], 10);
}

function formatCnpj(v: string) {
  const c = v.replace(/\D/g, '').slice(0, 14);
  return c
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function NewProspectModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const create = useCreateProspectContact();
  const [form, setForm] = useState({
    side: 'sell' as ProspectSide,
    contact_name: '',
    company_name: '',
    cnpj: '',
    city: '',
    state: '',
    sector: '',
    email: '',
    phone: '',
    whatsapp: '',
    postal_address: '',
    postal_zipcode: '',
    source: 'outbound' as ProspectSource,
    source_notes: '',
    notes: '',
  });
  const [lookupLoading, setLookupLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleCnpjBlur() {
    const c = form.cnpj.replace(/\D/g, '');
    if (c.length !== 14 || !validCnpj(form.cnpj)) return;
    setLookupLoading(true);
    try {
      const { data } = await supabase.functions.invoke('company-lookup', { body: { cnpj: c } });
      const d = (data ?? {}) as any;
      setForm((f) => ({
        ...f,
        company_name: f.company_name || d.razao_social || d.fantasia || '',
        city: f.city || d.city || d.municipio || '',
        state: f.state || d.uf || d.state || '',
        sector: f.sector || d.cnae_principal_descricao || d.sector || '',
        postal_address: f.postal_address || [d.logradouro, d.numero, d.bairro].filter(Boolean).join(', '),
        postal_zipcode: f.postal_zipcode || (d.cep || '').replace(/\D/g, ''),
      }));
    } catch {
      // silencioso — usuário preenche manualmente
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.contact_name.trim() || !form.company_name.trim() || !form.city.trim() || !form.state || !form.sector.trim()) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    if (form.cnpj && !validCnpj(form.cnpj)) {
      toast({ title: 'CNPJ inválido', variant: 'destructive' });
      return;
    }
    try {
      await create.mutateAsync({
        ...form,
        cnpj: form.cnpj || null,
        email: form.email || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        postal_address: form.postal_address || null,
        postal_zipcode: form.postal_zipcode || null,
        source_notes: form.source_notes || null,
        notes: form.notes || null,
        status: 'new',
        tags: [],
        next_followup_at: null,
      });
      toast({ title: 'Contato adicionado à prospecção' });
      onOpenChange(false);
      setForm({
        side: 'sell', contact_name: '', company_name: '', cnpj: '', city: '', state: '',
        sector: '', email: '', phone: '', whatsapp: '', postal_address: '', postal_zipcode: '',
        source: 'outbound', source_notes: '', notes: '',
      });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err?.message ?? String(err), variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark bg-zinc-950 border-zinc-800 text-zinc-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Novo contato de prospecção</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lado *</Label>
              <Select value={form.side} onValueChange={(v) => set('side', v as ProspectSide)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue /></SelectTrigger>
                <SelectContent className="dark bg-zinc-950 border-zinc-800">
                  <SelectItem value="sell">Sell-side (vendedor)</SelectItem>
                  <SelectItem value="buy">Buy-side (comprador)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Origem *</Label>
              <Select value={form.source} onValueChange={(v) => set('source', v as ProspectSource)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue /></SelectTrigger>
                <SelectContent className="dark bg-zinc-950 border-zinc-800">
                  {Object.entries(PROSPECT_SOURCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Nome do contato *</Label>
            <Input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} className="bg-zinc-900 border-zinc-800" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CNPJ {lookupLoading && <span className="text-zinc-500 text-xs">(buscando…)</span>}</Label>
              <Input
                value={form.cnpj}
                onChange={(e) => set('cnpj', formatCnpj(e.target.value))}
                onBlur={handleCnpjBlur}
                placeholder="00.000.000/0000-00"
                className="bg-zinc-900 border-zinc-800 font-mono"
              />
            </div>
            <div>
              <Label>Empresa *</Label>
              <Input value={form.company_name} onChange={(e) => set('company_name', e.target.value)} className="bg-zinc-900 border-zinc-800" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Cidade *</Label>
              <Input value={form.city} onChange={(e) => set('city', e.target.value)} className="bg-zinc-900 border-zinc-800" />
            </div>
            <div>
              <Label>UF *</Label>
              <Select value={form.state} onValueChange={(v) => set('state', v)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="dark bg-zinc-950 border-zinc-800 max-h-72">
                  {BR_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Setor *</Label>
            <Input value={form.sector} onChange={(e) => set('sector', e.target.value)} placeholder="Ex.: Telecom, Educação, SaaS" className="bg-zinc-900 border-zinc-800" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="bg-zinc-900 border-zinc-800" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="bg-zinc-900 border-zinc-800" />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} className="bg-zinc-900 border-zinc-800" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Endereço postal</Label>
              <Input value={form.postal_address} onChange={(e) => set('postal_address', e.target.value)} placeholder="Rua, nº, bairro" className="bg-zinc-900 border-zinc-800" />
            </div>
            <div>
              <Label>CEP</Label>
              <Input
                value={form.postal_zipcode}
                onChange={(e) => set('postal_zipcode', e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="00000000"
                className="bg-zinc-900 border-zinc-800 font-mono"
              />
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="bg-zinc-900 border-zinc-800" />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent border-zinc-700 text-zinc-100 hover:bg-zinc-800">
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending} className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 font-semibold">
              {create.isPending ? 'Salvando…' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
