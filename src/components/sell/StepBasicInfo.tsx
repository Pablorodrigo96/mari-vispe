import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categories } from '@/data/mockData';

interface StepBasicInfoProps {
  data: {
    title: string;
    category: string;
    description: string;
  };
  onChange: (field: string, value: string) => void;
}

const StepBasicInfo = ({ data, onChange }: StepBasicInfoProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Informações Básicas
        </h2>
        <p className="text-muted-foreground mt-2">
          Descreva sua empresa para atrair os compradores certos
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Título do Anúncio *</Label>
          <Input
            id="title"
            placeholder="Ex: Restaurante Italiano em Pinheiros com 10 anos de mercado"
            value={data.title}
            onChange={(e) => onChange('title', e.target.value)}
            className="h-12"
          />
          <p className="text-xs text-muted-foreground">
            Seja específico e destaque os pontos fortes do negócio
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria Principal *</Label>
          <Select
            value={data.category}
            onValueChange={(value) => onChange('category', value)}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição do Negócio *</Label>
          <Textarea
            id="description"
            placeholder="Descreva seu negócio em detalhes: história, diferencias, equipe, infraestrutura..."
            value={data.description}
            onChange={(e) => onChange('description', e.target.value)}
            className="min-h-[150px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Mínimo de 100 caracteres. Quanto mais detalhes, melhor!
          </p>
        </div>
      </div>
    </div>
  );
};

export default StepBasicInfo;
