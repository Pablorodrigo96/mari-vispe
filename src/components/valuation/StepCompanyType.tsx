import { Building2, Rocket, Zap } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { companyTypeConfig, CompanyType } from '@/lib/dcfCalculator';

interface StepCompanyTypeProps {
  data: {
    companyType: CompanyType | '';
  };
  onChange: (field: string, value: string) => void;
}

const companyTypeIcons = {
  tradicional: Building2,
  nova_economia: Zap,
  startup: Rocket,
};

export const StepCompanyType = ({ data, onChange }: StepCompanyTypeProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Tipo de Empresa
        </h2>
        <p className="text-muted-foreground text-sm">
          Selecione o perfil que melhor descreve seu negócio. Isso impacta as taxas de desconto e premissas de crescimento.
        </p>
      </div>

      <RadioGroup
        value={data.companyType}
        onValueChange={(value) => onChange('companyType', value)}
        className="space-y-4"
      >
        {(Object.keys(companyTypeConfig) as CompanyType[]).map((type) => {
          const config = companyTypeConfig[type];
          const Icon = companyTypeIcons[type];
          
          return (
            <div key={type}>
              <RadioGroupItem
                value={type}
                id={type}
                className="peer sr-only"
              />
              <Label
                htmlFor={type}
                className="flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-accent/50 peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/5"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{config.label}</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {config.description}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-muted px-2 py-1 rounded">
                      Crescimento: {(config.growthRate * 100).toFixed(0)}% a.a.
                    </span>
                    <span className="bg-muted px-2 py-1 rounded">
                      WACC: {(config.wacc * 100).toFixed(2)}%
                    </span>
                    <span className="bg-muted px-2 py-1 rounded">
                      Margem: {config.marginGrowth ? '+1 p.p./ano' : 'Constante'}
                    </span>
                  </div>
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      <div className="bg-muted/50 rounded-xl p-4">
        <h4 className="font-medium text-foreground text-sm mb-2">ℹ️ Premissas do Modelo</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Taxa Selic base: 15% a.a.</li>
          <li>• Projeção: 3 anos + valor terminal</li>
          <li>• Crescimento terminal (g): 4,5% a.a.</li>
          <li>• Análise de sensibilidade: ±6%</li>
        </ul>
      </div>
    </div>
  );
};
