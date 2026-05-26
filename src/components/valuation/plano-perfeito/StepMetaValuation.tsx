import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Target } from 'lucide-react';

interface Props {
  value: number;
  onChange: (v: number) => void;
}

const PRESETS = [
  { label: 'R$ 100 Mi', value: 100_000_000 },
  { label: 'R$ 500 Mi', value: 500_000_000 },
  { label: 'R$ 1 Bi',   value: 1_000_000_000 },
];

const formatBRL = (n: number) =>
  n > 0 ? n.toLocaleString('pt-BR') : '';

export const StepMetaValuation = ({ value, onChange }: Props) => {
  const isCustom = value > 0 && !PRESETS.some(p => p.value === value);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent mb-3">
          <Target className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Qual sua meta de valuation?</h3>
        <p className="text-sm text-muted-foreground mt-1">Escolha um preset ou defina o seu próprio número.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {PRESETS.map((p) => {
          const selected = value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              className={`rounded-xl border-2 p-4 text-center transition-all ${
                selected
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-card hover:border-accent/50 text-foreground'
              }`}
            >
              <p className="font-bold text-lg">{p.label}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="metaCustom" className="font-semibold">
          Ou defina sua meta (R$)
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
          <Input
            id="metaCustom"
            type="text"
            inputMode="numeric"
            value={isCustom ? formatBRL(value) : ''}
            onChange={(e) => {
              const num = parseInt(e.target.value.replace(/\D/g, ''), 10);
              onChange(isNaN(num) ? 0 : num);
            }}
            placeholder="Ex: 250.000.000"
            className="pl-10 h-12 text-lg"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Dica: sonhe grande — esta é a meta que sua empresa precisa atingir.
        </p>
      </div>
    </div>
  );
};
