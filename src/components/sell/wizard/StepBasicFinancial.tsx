import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categories } from '@/data/mockData';
import { Building2, DollarSign, Eye, EyeOff } from 'lucide-react';

interface StepBasicFinancialProps {
  data: {
    title: string;
    category: string;
    foundationYear: string;
    cnpj: string;
    annualRevenue: string;
    annualProfit: string;
    askingPrice: string;
    hidePrice: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  return numbers.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  ).replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/,
    '$1.$2.$3/$4-$5'
  ).replace(
    /^(\d{2})(\d{3})(\d{3})(\d{0,4})$/,
    '$1.$2.$3/$4'
  ).replace(
    /^(\d{2})(\d{3})(\d{0,3})$/,
    '$1.$2.$3'
  ).replace(
    /^(\d{2})(\d{0,3})$/,
    '$1.$2'
  );
};

const formatCurrency = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  const amount = parseInt(numbers) / 100;
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const parseCurrency = (value: string): number => {
  const numbers = value.replace(/\D/g, '');
  return numbers ? parseInt(numbers) / 100 : 0;
};

const StepBasicFinancial = ({ data, onChange }: StepBasicFinancialProps) => {
  const margin = useMemo(() => {
    const revenue = parseCurrency(data.annualRevenue);
    const profit = parseCurrency(data.annualProfit);
    if (revenue > 0 && profit > 0) {
      return (profit / revenue) * 100;
    }
    return null;
  }, [data.annualRevenue, data.annualProfit]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const handleCNPJChange = (value: string) => {
    onChange('cnpj', formatCNPJ(value));
  };

  const handleCurrencyChange = (field: string, value: string) => {
    onChange(field, formatCurrency(value));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Informações da Empresa
        </h2>
        <p className="text-muted-foreground mt-2">
          Dados básicos e financeiros do seu negócio
        </p>
      </div>

      {/* Basic Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Building2 className="w-5 h-5 text-accent" />
          <span>Dados Básicos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Título do Anúncio *</Label>
            <Input
              id="title"
              placeholder="Ex: Restaurante Italiano em Pinheiros"
              value={data.title}
              onChange={(e) => onChange('title', e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria Principal *</Label>
            <Select
              value={data.category}
              onValueChange={(value) => onChange('category', value)}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <img src={cat.image} alt={cat.label} className="w-5 h-5 rounded object-cover" />
                      <span>{cat.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="foundationYear">Ano de Fundação</Label>
            <Select
              value={data.foundationYear}
              onValueChange={(value) => onChange('foundationYear', value)}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              placeholder="00.000.000/0000-00"
              value={data.cnpj}
              onChange={(e) => handleCNPJChange(e.target.value)}
              className="h-12"
              maxLength={18}
            />
          </div>
        </div>
      </div>

      {/* Financial Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <DollarSign className="w-5 h-5 text-accent" />
          <span>Dados Financeiros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="annualRevenue">Faturamento Bruto Anual *</Label>
            <Input
              id="annualRevenue"
              placeholder="R$ 0,00"
              value={data.annualRevenue}
              onChange={(e) => handleCurrencyChange('annualRevenue', e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="annualProfit">Lucro Líquido Anual *</Label>
            <Input
              id="annualProfit"
              placeholder="R$ 0,00"
              value={data.annualProfit}
              onChange={(e) => handleCurrencyChange('annualProfit', e.target.value)}
              className="h-12"
            />
          </div>

          {/* Margin Badge */}
          {margin !== null && (
            <div className="md:col-span-2 flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Margem Líquida:</span>
              <Badge
                variant="outline"
                className={
                  margin >= 20
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                }
              >
                {margin.toFixed(1)}%
              </Badge>
              <span className="text-xs text-muted-foreground">
                {margin >= 20 ? '✓ Margem saudável' : '⚠ Margem abaixo de 20%'}
              </span>
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="askingPrice">Valor da Empresa (Asking Price) *</Label>
            <div className="flex gap-3">
              <Input
                id="askingPrice"
                placeholder="R$ 0,00"
                value={data.askingPrice}
                onChange={(e) => handleCurrencyChange('askingPrice', e.target.value)}
                className="h-12 flex-1"
              />
              <div className="flex items-center gap-2 px-4 bg-muted rounded-lg">
                <Switch
                  id="hidePrice"
                  checked={data.hidePrice}
                  onCheckedChange={(checked) => onChange('hidePrice', checked)}
                />
                <Label
                  htmlFor="hidePrice"
                  className="text-sm cursor-pointer flex items-center gap-1"
                >
                  {data.hidePrice ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span className="hidden sm:inline">Ocultar</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Exibir</span>
                    </>
                  )}
                </Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {data.hidePrice
                ? 'O valor será exibido como "Sob Consulta"'
                : 'O valor será exibido publicamente no anúncio'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepBasicFinancial;