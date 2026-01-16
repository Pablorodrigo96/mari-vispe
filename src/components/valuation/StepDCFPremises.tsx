import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, CreditCard, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StepDCFPremisesProps {
  data: {
    capex: string;
    debtPayment: string;
  };
  onChange: (field: string, value: string) => void;
}

const formatCurrencyInput = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  
  const numValue = parseInt(numbers, 10);
  return numValue.toLocaleString('pt-BR');
};

export const StepDCFPremises = ({ data, onChange }: StepDCFPremisesProps) => {
  const handleCurrencyChange = (field: string, value: string) => {
    const formatted = formatCurrencyInput(value);
    onChange(field, formatted);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Premissas do DCF
        </h2>
        <p className="text-muted-foreground text-sm">
          Informe os investimentos e obrigações financeiras anuais da empresa.
        </p>
      </div>

      <div className="space-y-5">
        {/* CapEx */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="capex" className="text-sm font-medium">
              Investimentos Anuais (CapEx)
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Capital Expenditure: investimentos em ativos fixos como equipamentos, 
                  imóveis, veículos, tecnologia, etc. Se não houver investimentos recorrentes, 
                  coloque 0.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative">
            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <span className="absolute left-9 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              R$
            </span>
            <Input
              id="capex"
              value={data.capex}
              onChange={(e) => handleCurrencyChange('capex', e.target.value)}
              placeholder="0"
              className="pl-16 text-right"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Ex: R$ 50.000 se a empresa investe anualmente em equipamentos
          </p>
        </div>

        {/* Debt Payment */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="debtPayment" className="text-sm font-medium">
              Pagamento de Dívidas Anual
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Valor anual destinado ao pagamento de principal de empréstimos, 
                  financiamentos e outras dívidas. Se não houver dívidas, coloque 0.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <span className="absolute left-9 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              R$
            </span>
            <Input
              id="debtPayment"
              value={data.debtPayment}
              onChange={(e) => handleCurrencyChange('debtPayment', e.target.value)}
              placeholder="0"
              className="pl-16 text-right"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Ex: R$ 100.000 se há parcelas anuais de financiamentos
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
        <h4 className="font-medium text-foreground text-sm mb-2">💡 Por que isso importa?</h4>
        <p className="text-xs text-muted-foreground">
          O Fluxo de Caixa Livre (FCFF) é calculado subtraindo investimentos e pagamento 
          de dívidas do EBITDA. Isso representa o caixa realmente disponível para 
          remunerar acionistas e ser reinvestido no crescimento.
        </p>
        <div className="mt-3 p-3 bg-background rounded-lg">
          <p className="text-xs font-mono text-muted-foreground text-center">
            FCFF = EBITDA - CapEx - Pagamento de Dívidas
          </p>
        </div>
      </div>
    </div>
  );
};
