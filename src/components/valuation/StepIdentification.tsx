import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface StepIdentificationProps {
  data: {
    fullName: string;
    companyName: string;
    email: string;
    phone: string;
    acceptTerms: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

export const StepIdentification = ({ data, onChange }: StepIdentificationProps) => {
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold text-foreground">
          Para quem devemos enviar o laudo?
        </h3>
        <p className="text-muted-foreground text-sm mt-1">
          Preencha os dados abaixo para receber seu valuation
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo *</Label>
          <Input
            id="fullName"
            type="text"
            value={data.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
            placeholder="Seu nome completo"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">Nome da Empresa *</Label>
          <Input
            id="companyName"
            type="text"
            value={data.companyName}
            onChange={(e) => onChange('companyName', e.target.value)}
            placeholder="Nome da sua empresa"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Corporativo *</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="seu@empresa.com"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone/WhatsApp *</Label>
          <Input
            id="phone"
            type="tel"
            value={data.phone}
            onChange={(e) => onChange('phone', formatPhone(e.target.value))}
            placeholder="(11) 99999-9999"
            className="h-12"
          />
        </div>
      </div>

      <div className="flex items-start gap-3 pt-4">
        <Checkbox
          id="acceptTerms"
          checked={data.acceptTerms}
          onCheckedChange={(checked) => onChange('acceptTerms', checked === true)}
        />
        <label htmlFor="acceptTerms" className="text-sm text-muted-foreground cursor-pointer">
          Aceito os{' '}
          <a href="/terms" className="text-accent hover:underline">
            termos e condições
          </a>{' '}
          e a{' '}
          <a href="/terms" className="text-accent hover:underline">
            política de privacidade
          </a>
          .
        </label>
      </div>
    </div>
  );
};
