import { Slider } from '@/components/ui/slider';
import { Calendar } from 'lucide-react';

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export const StepPrazo = ({ value, onChange }: Props) => {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent mb-3">
          <Calendar className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Em quantos anos quer chegar lá?</h3>
        <p className="text-sm text-muted-foreground mt-1">Arraste para escolher o prazo.</p>
      </div>

      <div className="rounded-2xl border-2 border-accent/30 bg-accent/5 p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Prazo</p>
        <p className="text-6xl font-black text-accent tabular-nums">{value}</p>
        <p className="text-lg text-foreground mt-1">{value === 1 ? 'ano' : 'anos'}</p>
      </div>

      <div className="px-2">
        <Slider
          min={1}
          max={15}
          step={1}
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          className="my-4"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 ano</span>
          <span>15 anos</span>
        </div>
      </div>
    </div>
  );
};
