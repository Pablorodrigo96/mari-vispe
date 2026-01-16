import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Store, Ruler, Home, FileText } from 'lucide-react';

interface StepCommercialSpaceProps {
  data: {
    squareMeters: string;
    rentValue: string;
    iptuValue: string;
    saleReason: string;
  };
  onChange: (field: string, value: string) => void;
}

const saleReasons = [
  { id: 'retirement', label: 'Aposentadoria' },
  { id: 'relocation', label: 'Mudança de cidade/país' },
  { id: 'partners', label: 'Desentendimento entre sócios' },
  { id: 'new_business', label: 'Novo negócio/oportunidade' },
  { id: 'health', label: 'Problemas de saúde' },
  { id: 'family', label: 'Motivos familiares' },
  { id: 'burnout', label: 'Cansaço/Esgotamento' },
  { id: 'capital', label: 'Necessidade de capital' },
  { id: 'other', label: 'Outro motivo' },
];

const formatCurrency = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  const amount = parseInt(numbers) / 100;
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const formatNumber = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  return parseInt(numbers).toLocaleString('pt-BR');
};

const StepCommercialSpace = ({ data, onChange }: StepCommercialSpaceProps) => {
  const handleCurrencyChange = (field: string, value: string) => {
    onChange(field, formatCurrency(value));
  };

  const handleNumberChange = (field: string, value: string) => {
    onChange(field, formatNumber(value));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Ponto Comercial e Venda
        </h2>
        <p className="text-muted-foreground mt-2">
          Informações sobre o espaço físico e motivo da venda
        </p>
      </div>

      {/* Commercial Space */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Store className="w-5 h-5 text-accent" />
          <span>Ponto Comercial</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="squareMeters" className="flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Metros Quadrados
            </Label>
            <div className="relative">
              <Input
                id="squareMeters"
                placeholder="0"
                value={data.squareMeters}
                onChange={(e) => handleNumberChange('squareMeters', e.target.value)}
                className="h-12 pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                m²
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rentValue" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Valor do Aluguel
            </Label>
            <Input
              id="rentValue"
              placeholder="R$ 0,00"
              value={data.rentValue}
              onChange={(e) => handleCurrencyChange('rentValue', e.target.value)}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              Valor mensal do aluguel do ponto
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="iptuValue" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              IPTU Anual
            </Label>
            <Input
              id="iptuValue"
              placeholder="R$ 0,00"
              value={data.iptuValue}
              onChange={(e) => handleCurrencyChange('iptuValue', e.target.value)}
              className="h-12"
            />
          </div>
        </div>
      </div>

      {/* Sale Reason */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <FileText className="w-5 h-5 text-accent" />
          <span>Motivo da Venda</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="saleReason">Por que você está vendendo? *</Label>
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
          <p className="text-xs text-muted-foreground">
            Essa informação ajuda compradores a entender melhor a oportunidade
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
        <h4 className="font-medium text-foreground mb-2">💡 Dica</h4>
        <p className="text-sm text-muted-foreground">
          Informações claras sobre o ponto comercial e motivo da venda aumentam a confiança 
          dos compradores e aceleram o processo de negociação.
        </p>
      </div>
    </div>
  );
};

export default StepCommercialSpace;