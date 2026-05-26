import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { Viabilidade } from '@/lib/planoPerfeitoCalculator';

interface Props {
  viabilidade: Viabilidade;
  mensagem: string;
  percentualReceita: number;
}

const conf: Record<Viabilidade, { Icon: any; bg: string; text: string; label: string }> = {
  green:  { Icon: CheckCircle2, bg: 'bg-emerald-500/10 border-emerald-500/40', text: 'text-emerald-400', label: 'Viável' },
  yellow: { Icon: AlertTriangle, bg: 'bg-amber-500/10 border-amber-500/40',   text: 'text-amber-400',   label: 'Atenção' },
  red:    { Icon: ShieldAlert,   bg: 'bg-rose-500/10 border-rose-500/40',     text: 'text-rose-400',    label: 'Reavaliar' },
};

export const ViabilitySemaforo = ({ viabilidade, mensagem, percentualReceita }: Props) => {
  const c = conf[viabilidade];
  return (
    <div className={`rounded-2xl border-2 p-5 ${c.bg}`}>
      <div className="flex items-start gap-4">
        <c.Icon className={`h-8 w-8 shrink-0 ${c.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-xs uppercase tracking-widest font-bold ${c.text}`}>{c.label}</p>
            {percentualReceita > 0 && (
              <span className="text-xs text-muted-foreground">
                · {(percentualReceita * 100).toFixed(0)}% da receita mensal
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base text-foreground leading-relaxed break-words">{mensagem}</p>
        </div>
      </div>
    </div>
  );
};
