import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';

export interface LeadFormData {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
}

interface Props {
  data: LeadFormData;
  onChange: (field: keyof LeadFormData, value: string) => void;
}

export const StepLeadCapture = ({ data, onChange }: Props) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent mb-3">
          <Mail className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Vamos enviar seu Plano Perfeito por e-mail</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Criamos uma conta automaticamente para você acessar o plano sempre que quiser.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fullName" className="font-semibold">Nome completo *</Label>
          <Input id="fullName" value={data.fullName} onChange={(e) => onChange('fullName', e.target.value)} placeholder="Seu nome" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="font-semibold">E-mail *</Label>
          <Input id="email" type="email" value={data.email} onChange={(e) => onChange('email', e.target.value)} placeholder="voce@empresa.com" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="font-semibold">WhatsApp *</Label>
          <Input id="phone" type="tel" value={data.phone} onChange={(e) => onChange('phone', e.target.value)} placeholder="(11) 99999-9999" className="h-11" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="companyName" className="font-semibold">Empresa *</Label>
          <Input id="companyName" value={data.companyName} onChange={(e) => onChange('companyName', e.target.value)} placeholder="Razão social ou nome fantasia" className="h-11" />
        </div>
      </div>

      <p className="text-[11px] text-center text-muted-foreground">
        Ao continuar você concorda com nossos termos. Enviaremos uma senha temporária para o e-mail informado.
      </p>
    </div>
  );
};
