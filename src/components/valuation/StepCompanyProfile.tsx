import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Rocket, Lightbulb } from 'lucide-react';

interface StepCompanyProfileProps {
  data: {
    companyType: string;
    segment: string;
  };
  onChange: (field: string, value: string) => void;
}

const companyTypes = [
  {
    value: 'tradicional',
    label: 'Empresa Tradicional',
    description: 'Negócio estabelecido com modelo tradicional',
    icon: Building2,
  },
  {
    value: 'nova-economia',
    label: 'Nova Economia',
    description: 'Empresa digital ou baseada em tecnologia',
    icon: Lightbulb,
  },
  {
    value: 'startup',
    label: 'Startup',
    description: 'Empresa em fase inicial de alto crescimento',
    icon: Rocket,
  },
];

const segments = [
  'SaaS',
  'Fintech',
  'E-commerce',
  'Saúde',
  'Agronegócio',
  'Educação',
  'Logística',
  'Indústria',
  'Varejo',
  'Serviços',
  'Outros',
];

export const StepCompanyProfile = ({ data, onChange }: StepCompanyProfileProps) => {
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold text-foreground">
          Perfil da Empresa
        </h3>
        <p className="text-muted-foreground text-sm mt-1">
          Selecione o tipo e segmento da sua empresa
        </p>
      </div>

      {/* Company Type Cards */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Tipo de Empresa *</Label>
        <RadioGroup
          value={data.companyType}
          onValueChange={(value) => onChange('companyType', value)}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {companyTypes.map((type) => {
            const Icon = type.icon;
            return (
              <label
                key={type.value}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all text-center ${
                  data.companyType === type.value
                    ? 'border-accent bg-accent/5'
                    : 'border-border bg-card hover:border-accent/30'
                }`}
              >
                <RadioGroupItem value={type.value} className="sr-only" />
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    data.companyType === type.value
                      ? 'bg-accent/20'
                      : 'bg-muted'
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      data.companyType === type.value
                        ? 'text-accent'
                        : 'text-muted-foreground'
                    }`}
                  />
                </div>
                <div>
                  <p
                    className={`font-medium ${
                      data.companyType === type.value
                        ? 'text-accent'
                        : 'text-foreground'
                    }`}
                  >
                    {type.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {type.description}
                  </p>
                </div>
              </label>
            );
          })}
        </RadioGroup>
      </div>

      {/* Segment Dropdown */}
      <div className="space-y-2">
        <Label htmlFor="segment" className="text-base font-semibold">
          Segmento *
        </Label>
        <Select
          value={data.segment}
          onValueChange={(value) => onChange('segment', value)}
        >
          <SelectTrigger id="segment" className="h-12">
            <SelectValue placeholder="Selecione o segmento da empresa" />
          </SelectTrigger>
          <SelectContent>
            {segments.map((segment) => (
              <SelectItem key={segment} value={segment}>
                {segment}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          O segmento determina os múltiplos de mercado utilizados no cálculo
        </p>
      </div>
    </div>
  );
};
