import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { parseCurrency } from '@/lib/valuationCalculator';
import { formatFullCurrency } from '@/lib/formatters';

interface StepFinancialDataProps {
  data: {
    annualRevenue: string;
    ebitdaMargin: string;
    netProfit: string;
  };
  onChange: (field: string, value: string) => void;
}

export const StepFinancialData = ({ data, onChange }: StepFinancialDataProps) => {
  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const numValue = parseInt(numbers, 10);
    return numValue.toLocaleString('pt-BR');
  };

  const handleCurrencyChange = (field: string, value: string) => {
    const formatted = formatCurrencyInput(value);
    onChange(field, formatted);
  };

  // Calcular EBITDA absoluto
  const revenue = parseCurrency(data.annualRevenue);
  const margin = parseFloat(data.ebitdaMargin) || 0;
  const calculatedEbitda = revenue * (margin / 100);

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold text-foreground">
          Dados Financeiros
        </h3>
        <p className="text-muted-foreground text-sm mt-1">
          Informe os dados dos últimos 12 meses
        </p>
      </div>

      <div className="space-y-6">
        {/* Faturamento Bruto */}
        <div className="space-y-2">
          <Label htmlFor="annualRevenue" className="text-base font-semibold">
            Faturamento Bruto (Últimos 12 meses) *
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              R$
            </span>
            <Input
              id="annualRevenue"
              type="text"
              value={data.annualRevenue}
              onChange={(e) => handleCurrencyChange('annualRevenue', e.target.value)}
              placeholder="0"
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>

        {/* Margem EBITDA */}
        <div className="space-y-2">
          <Label htmlFor="ebitdaMargin" className="text-base font-semibold">
            Margem EBITDA (%) *
          </Label>
          <div className="relative">
            <Input
              id="ebitdaMargin"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={data.ebitdaMargin}
              onChange={(e) => onChange('ebitdaMargin', e.target.value)}
              placeholder="Ex: 20"
              className="pr-10 h-12 text-lg"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </div>
          
          {/* EBITDA Calculado */}
          {revenue > 0 && margin > 0 && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                EBITDA Calculado:{' '}
                <span className="font-semibold text-accent">
                  {formatFullCurrency(calculatedEbitda)}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Lucro Líquido */}
        <div className="space-y-2">
          <Label htmlFor="netProfit" className="text-base font-semibold">
            Lucro Líquido (Últimos 12 meses) *
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              R$
            </span>
            <Input
              id="netProfit"
              type="text"
              value={data.netProfit}
              onChange={(e) => handleCurrencyChange('netProfit', e.target.value)}
              placeholder="0"
              className="pl-10 h-12 text-lg"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Informe 0 se a empresa estiver com prejuízo
          </p>
        </div>
      </div>
    </div>
  );
};
