import { Building, Rocket, Briefcase } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface StepBasicDataProps {
  data: {
    companyType: string;
    segment: string;
    annualRevenue: string;
    ebitdaPercentage: string;
    tangibleAssets: string;
    totalDebt: string;
  };
  onChange: (field: string, value: string) => void;
}

const companyTypes = [
  { id: 'traditional', label: 'Empresa Tradicional', icon: Building, description: 'Negócio consolidado com modelo tradicional' },
  { id: 'new-economy', label: 'Empresa Nova Economia', icon: Briefcase, description: 'Modelo de negócio digital ou inovador' },
  { id: 'startup', label: 'Empresa Startup', icon: Rocket, description: 'Em fase de crescimento acelerado' },
];

const segments = [
  'SaaS',
  'E-commerce',
  'Fintech',
  'Indústria',
  'Varejo',
  'Serviços',
  'Saúde',
  'Educação',
  'Logística',
  'Agronegócio',
  'Outros',
];

export const StepBasicData = ({ data, onChange }: StepBasicDataProps) => {
  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const amount = parseInt(numbers, 10);
    return amount.toLocaleString('pt-BR');
  };

  const handleCurrencyChange = (field: string, value: string) => {
    const formatted = formatCurrency(value);
    onChange(field, formatted);
  };

  return (
    <div className="space-y-8">
      {/* Company Type Selection */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Tipo de Empresa</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {companyTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = data.companyType === type.id;
            
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => onChange('companyType', type.id)}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  isSelected
                    ? 'border-gold bg-gold/5'
                    : 'border-border bg-card hover:border-gold/30'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center mb-3',
                  isSelected ? 'bg-gold/20' : 'bg-muted'
                )}>
                  <Icon className={cn('w-5 h-5', isSelected ? 'text-gold' : 'text-muted-foreground')} />
                </div>
                <p className={cn('font-semibold text-sm', isSelected ? 'text-gold' : 'text-foreground')}>
                  {type.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Segment */}
      <div className="space-y-2">
        <Label htmlFor="segment">Segmento da Empresa *</Label>
        <Select value={data.segment} onValueChange={(value) => onChange('segment', value)}>
          <SelectTrigger id="segment">
            <SelectValue placeholder="Selecione o segmento" />
          </SelectTrigger>
          <SelectContent>
            {segments.map((segment) => (
              <SelectItem key={segment} value={segment.toLowerCase()}>
                {segment}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Financial Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="annualRevenue">Faturamento Bruto (últimos 12 meses) *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
            <Input
              id="annualRevenue"
              type="text"
              value={data.annualRevenue}
              onChange={(e) => handleCurrencyChange('annualRevenue', e.target.value)}
              placeholder="0"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ebitdaPercentage">EBITDA em % *</Label>
          <div className="relative">
            <Input
              id="ebitdaPercentage"
              type="number"
              min="0"
              max="100"
              value={data.ebitdaPercentage}
              onChange={(e) => onChange('ebitdaPercentage', e.target.value)}
              placeholder="0"
              className="pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tangibleAssets">Ativos Tangíveis</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
            <Input
              id="tangibleAssets"
              type="text"
              value={data.tangibleAssets}
              onChange={(e) => handleCurrencyChange('tangibleAssets', e.target.value)}
              placeholder="0"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalDebt">Endividamento Total</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
            <Input
              id="totalDebt"
              type="text"
              value={data.totalDebt}
              onChange={(e) => handleCurrencyChange('totalDebt', e.target.value)}
              placeholder="0"
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
