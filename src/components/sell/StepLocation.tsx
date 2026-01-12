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
import { states } from '@/data/mockData';

interface StepLocationProps {
  data: {
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    hideAddress: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

const formatCep = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

const StepLocation = ({ data, onChange }: StepLocationProps) => {
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    onChange('cep', formatted);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Localização</h2>
        <p className="text-muted-foreground mt-2">
          Informe onde sua empresa está localizada
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cep">CEP *</Label>
            <Input
              id="cep"
              placeholder="00000-000"
              value={data.cep}
              onChange={handleCepChange}
              maxLength={9}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">Estado *</Label>
            <Select
              value={data.state}
              onValueChange={(value) => onChange('state', value)}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione o estado" />
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Cidade *</Label>
          <Input
            id="city"
            placeholder="Nome da cidade"
            value={data.city}
            onChange={(e) => onChange('city', e.target.value)}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input
            id="neighborhood"
            placeholder="Nome do bairro"
            value={data.neighborhood}
            onChange={(e) => onChange('neighborhood', e.target.value)}
            className="h-12"
          />
        </div>

        <div className="flex items-center space-x-3 pt-4">
          <Checkbox
            id="hideAddress"
            checked={data.hideAddress}
            onCheckedChange={(checked) =>
              onChange('hideAddress', checked as boolean)
            }
          />
          <Label
            htmlFor="hideAddress"
            className="text-sm font-normal cursor-pointer"
          >
            Não exibir endereço exato no anúncio (recomendado para
            confidencialidade)
          </Label>
        </div>
      </div>
    </div>
  );
};

export default StepLocation;
