import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MapPin, FileText, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface StepDescriptionLocationProps {
  data: {
    description: string;
    cep: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    showAddress: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

const formatCEP = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  return numbers.replace(/^(\d{5})(\d{0,3})$/, '$1-$2');
};

const StepDescriptionLocation = ({ data, onChange }: StepDescriptionLocationProps) => {
  const [isSearching, setIsSearching] = useState(false);

  const handleCEPChange = (value: string) => {
    const formatted = formatCEP(value);
    onChange('cep', formatted);

    // Auto-search when CEP is complete
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 8) {
      searchCEP(numbers);
    }
  };

  const searchCEP = async (cep: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      onChange('street', data.logradouro || '');
      onChange('neighborhood', data.bairro || '');
      onChange('city', data.localidade || '');
      onChange('state', data.uf || '');
      toast.success('Endereço preenchido automaticamente');
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = () => {
    const cep = data.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      searchCEP(cep);
    } else {
      toast.error('Digite um CEP válido com 8 dígitos');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Descrição e Localização
        </h2>
        <p className="text-muted-foreground mt-2">
          Descreva seu negócio e informe a localização
        </p>
      </div>

      {/* Description */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <FileText className="w-5 h-5 text-accent" />
          <span>Descrição do Negócio</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descreva sua empresa em detalhes *</Label>
          <Textarea
            id="description"
            placeholder="Conte a história do negócio, diferenciais, estrutura, equipe, clientes, potencial de crescimento..."
            value={data.description}
            onChange={(e) => onChange('description', e.target.value)}
            className="min-h-[200px] resize-none"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Mínimo de 100 caracteres</span>
            <span className={data.description.length >= 100 ? 'text-emerald-500' : ''}>
              {data.description.length} caracteres
            </span>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <MapPin className="w-5 h-5 text-accent" />
          <span>Localização</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cep">CEP *</Label>
            <div className="flex gap-2">
              <Input
                id="cep"
                placeholder="00000-000"
                value={data.cep}
                onChange={(e) => handleCEPChange(e.target.value)}
                className="h-12 flex-1"
                maxLength={9}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleManualSearch}
                disabled={isSearching}
                className="h-12 px-4"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Digite o CEP para preencher o endereço automaticamente
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="street">Rua / Logradouro</Label>
            <Input
              id="street"
              placeholder="Rua, Avenida, etc."
              value={data.street}
              onChange={(e) => onChange('street', e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              placeholder="Bairro"
              value={data.neighborhood}
              onChange={(e) => onChange('neighborhood', e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Cidade *</Label>
            <Input
              id="city"
              placeholder="Cidade"
              value={data.city}
              onChange={(e) => onChange('city', e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">Estado *</Label>
            <Input
              id="state"
              placeholder="UF"
              value={data.state}
              onChange={(e) => onChange('state', e.target.value)}
              className="h-12"
              maxLength={2}
            />
          </div>

          <div className="flex items-center space-x-2 md:col-span-2 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="showAddress"
              checked={data.showAddress}
              onCheckedChange={(checked) => onChange('showAddress', checked === true)}
            />
            <Label htmlFor="showAddress" className="text-sm cursor-pointer">
              Exibir endereço completo no anúncio
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepDescriptionLocation;