import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export interface LeadFormData {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  password: string;
  passwordConfirm: string;
}

interface Props {
  data: LeadFormData;
  onChange: (field: keyof LeadFormData, value: string) => void;
}

export const StepLeadCapture = ({ data, onChange }: Props) => {
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent mb-3">
          <Mail className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Crie sua conta para receber o Plano Perfeito</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Você vai usar esses dados para acessar o relatório completo, mês a mês, sempre que quiser.
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

        <div className="space-y-2">
          <Label htmlFor="password" className="font-semibold flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-accent" /> Senha *
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? 'text' : 'password'}
              value={data.password}
              onChange={(e) => onChange('password', e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="h-11 pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="passwordConfirm" className="font-semibold flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-accent" /> Confirme a senha *
          </Label>
          <div className="relative">
            <Input
              id="passwordConfirm"
              type={showPwd2 ? 'text' : 'password'}
              value={data.passwordConfirm}
              onChange={(e) => onChange('passwordConfirm', e.target.value)}
              placeholder="Repita sua senha"
              className="h-11 pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd2((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPwd2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-foreground/80">
        <ShieldCheck className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
        <span>
          <strong>Guarde sua senha.</strong> Com ela você acessa o relatório completo mês a mês,
          o plano de ações e atualizações futuras do seu Plano Perfeito.
        </span>
      </div>
    </div>
  );
};
