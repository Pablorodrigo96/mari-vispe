import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StepIdentificationProps {
  data: {
    fullName: string;
    companyName: string;
    website: string;
    state: string;
    city: string;
    foundingMonth: string;
    foundingYear: string;
    email: string;
    phone: string;
    acceptTerms: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

const states = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const months = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 50 }, (_, i) => String(currentYear - i));

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
          Preencha os dados abaixo para receber seu valuation completo.
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
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="website">Website da Empresa (opcional)</Label>
          <Input
            id="website"
            type="url"
            value={data.website}
            onChange={(e) => onChange('website', e.target.value)}
            placeholder="https://www.suaempresa.com.br"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">Estado *</Label>
          <Select value={data.state} onValueChange={(value) => onChange('state', value)}>
            <SelectTrigger id="state">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {states.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Cidade *</Label>
          <Input
            id="city"
            type="text"
            value={data.city}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder="Sua cidade"
          />
        </div>

        <div className="space-y-2">
          <Label>Mês de Fundação *</Label>
          <Select value={data.foundingMonth} onValueChange={(value) => onChange('foundingMonth', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ano de Fundação *</Label>
          <Select value={data.foundingYear} onValueChange={(value) => onChange('foundingYear', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="seu@email.com"
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
          <a href="/termos" className="text-gold hover:underline">
            termos e condições
          </a>{' '}
          e a{' '}
          <a href="/privacidade" className="text-gold hover:underline">
            política de privacidade
          </a>
          .
        </label>
      </div>
    </div>
  );
};
