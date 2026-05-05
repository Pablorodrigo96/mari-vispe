import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Rocket, Zap } from 'lucide-react';
import { SECTOR_OPTIONS } from '@/lib/sectorMapping';

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
    description: 'Produto validado, crescimento estável. Ideal para negócios consolidados que buscam segurança e constância nos resultados.',
    icon: Building2,
  },
  {
    value: 'nova-economia',
    label: 'Empresa Nova Economia',
    description: 'Produto em validação, foco em eficiência. Para negócios que usam canais digitais e buscam acelerar o crescimento com otimização operacional.',
    icon: Zap,
  },
  {
    value: 'startup',
    label: 'Startup',
    description: 'Fase de teste e escala acelerada. Para negócios inovadores focados em validar hipóteses e crescer exponencialmente, assumindo maior risco.',
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
          className="space-y-4"
        >
          {companyTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = data.companyType === type.value;
            return (
              <label
                key={type.value}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-accent bg-accent/5'
                    : 'border-border bg-card hover:border-accent/50'
                }`}
              >
                <RadioGroupItem value={type.value} className="sr-only" />
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-accent/20' : 'bg-accent/10'
                  }`}
                >
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${isSelected ? 'text-accent' : 'text-foreground'}`}>
                    {type.label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
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
