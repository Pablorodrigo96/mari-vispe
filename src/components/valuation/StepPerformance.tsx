import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface StepPerformanceProps {
  data: {
    revenueRecurrence: string;
    founderDependency: string;
  };
  onChange: (field: string, value: string) => void;
}

const recurrenceOptions = [
  { value: 'none', label: 'Nenhuma', description: 'Receita 100% transacional' },
  { value: 'partial', label: 'Parcial', description: 'Menos de 30% recorrente' },
  { value: 'moderate', label: 'Moderada', description: 'Entre 30% e 70% recorrente' },
  { value: 'high', label: 'Alta', description: 'Mais de 70% recorrente' },
];

const dependencyOptions = [
  { value: 'totally', label: 'Totalmente dependente', description: 'Operação não funciona sem o fundador' },
  { value: 'partially', label: 'Parcialmente dependente', description: 'Algumas áreas dependem do fundador' },
  { value: 'little', label: 'Pouco dependente', description: 'Fundador atua estrategicamente' },
  { value: 'independent', label: 'Independente', description: 'Gestão profissionalizada' },
];

export const StepPerformance = ({ data, onChange }: StepPerformanceProps) => {
  return (
    <div className="space-y-10">
      {/* Revenue Recurrence */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Nível de Recorrência de Receita</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Qual porcentagem da sua receita é recorrente (assinaturas, contratos)?
          </p>
        </div>
        
        <RadioGroup
          value={data.revenueRecurrence}
          onValueChange={(value) => onChange('revenueRecurrence', value)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {recurrenceOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                data.revenueRecurrence === option.value
                  ? 'border-gold bg-gold/5'
                  : 'border-border bg-card hover:border-gold/30'
              }`}
            >
              <RadioGroupItem value={option.value} className="mt-0.5" />
              <div>
                <p className={`font-medium ${data.revenueRecurrence === option.value ? 'text-gold' : 'text-foreground'}`}>
                  {option.label}
                </p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Founder Dependency */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Dependência do Fundador</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Quão dependente a empresa é do(s) fundador(es)?
          </p>
        </div>
        
        <RadioGroup
          value={data.founderDependency}
          onValueChange={(value) => onChange('founderDependency', value)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {dependencyOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                data.founderDependency === option.value
                  ? 'border-gold bg-gold/5'
                  : 'border-border bg-card hover:border-gold/30'
              }`}
            >
              <RadioGroupItem value={option.value} className="mt-0.5" />
              <div>
                <p className={`font-medium ${data.founderDependency === option.value ? 'text-gold' : 'text-foreground'}`}>
                  {option.label}
                </p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
};
