import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StepFinancialsProps {
  data: {
    annualRevenue: string;
    annualProfit: string;
    ebitda: string;
    askingPrice: string;
    saleReason: string;
  };
  onChange: (field: string, value: string) => void;
}

const formatCurrency = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  
  const amount = parseInt(numbers, 10);
  return amount.toLocaleString('pt-BR');
};

const saleReasons = [
  { id: 'retirement', label: 'Aposentadoria' },
  { id: 'new_project', label: 'Novo projeto/empreendimento' },
  { id: 'partnership', label: 'Dissolução de sociedade' },
  { id: 'relocation', label: 'Mudança de cidade/país' },
  { id: 'health', label: 'Questões de saúde' },
  { id: 'other', label: 'Outro motivo' },
];

const StepFinancials = ({ data, onChange }: StepFinancialsProps) => {
  const handleCurrencyChange = (field: string, value: string) => {
    const formatted = formatCurrency(value);
    onChange(field, formatted);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Dados Financeiros
        </h2>
        <p className="text-muted-foreground mt-2">
          Informações confidenciais visíveis apenas para compradores
          qualificados
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="annualRevenue">Faturamento Bruto Anual *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="annualRevenue"
                placeholder="0"
                value={data.annualRevenue}
                onChange={(e) =>
                  handleCurrencyChange('annualRevenue', e.target.value)
                }
                className="h-12 pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="annualProfit">Lucro Líquido Anual *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="annualProfit"
                placeholder="0"
                value={data.annualProfit}
                onChange={(e) =>
                  handleCurrencyChange('annualProfit', e.target.value)
                }
                className="h-12 pl-10"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ebitda">EBITDA (opcional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="ebitda"
                placeholder="0"
                value={data.ebitda}
                onChange={(e) =>
                  handleCurrencyChange('ebitda', e.target.value)
                }
                className="h-12 pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Lucro antes de juros, impostos, depreciação e amortização
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="askingPrice">Valor de Venda Desejado *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="askingPrice"
                placeholder="0"
                value={data.askingPrice}
                onChange={(e) =>
                  handleCurrencyChange('askingPrice', e.target.value)
                }
                className="h-12 pl-10"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="saleReason">Motivo da Venda *</Label>
          <Select
            value={data.saleReason}
            onValueChange={(value) => onChange('saleReason', value)}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Selecione o motivo" />
            </SelectTrigger>
            <SelectContent>
              {saleReasons.map((reason) => (
                <SelectItem key={reason.id} value={reason.id}>
                  {reason.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mt-6">
          <p className="text-sm text-muted-foreground">
            🔒 <strong>Seus dados estão protegidos.</strong> As informações
            financeiras só serão compartilhadas com compradores que assinarem
            um NDA (Acordo de Confidencialidade).
          </p>
        </div>
      </div>
    </div>
  );
};

export default StepFinancials;
