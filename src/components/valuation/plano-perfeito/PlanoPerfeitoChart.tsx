import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend } from 'recharts';
import type { PlanoPerfeitoResult } from '@/lib/planoPerfeitoCalculator';

const formatCompact = (n: number) => {
  if (n >= 1_000_000_000) return `R$ ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return `R$ ${n.toFixed(0)}`;
};

interface Props { result: PlanoPerfeitoResult; }

export const PlanoPerfeitoChart = ({ result }: Props) => {
  const data = result.serieMensal.map((d) => ({
    mes: d.mes,
    Valuation: Math.round(d.valuationProjetado),
    'Investimento acumulado': Math.round(d.investimentoAcumulado),
  }));

  const showRef = (target: number) =>
    target > result.valuationAtual && target < result.valuationMeta;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-6">
      <h4 className="text-sm font-semibold text-foreground mb-4 break-words">
        Evolução projetada do valuation × investimento acumulado em CAC
      </h4>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={11}
              tickFormatter={(m) => (m % 12 === 0 ? `${m / 12}a` : '')} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={formatCompact} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }}
              formatter={(v: number) => formatCompact(v)}
              labelFormatter={(m) => `Mês ${m}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {showRef(100_000_000) && <ReferenceLine y={100_000_000} stroke="hsl(var(--accent))" strokeDasharray="4 4" label={{ value: 'R$100M', fill: 'hsl(var(--accent))', fontSize: 10 }} />}
            {showRef(500_000_000) && <ReferenceLine y={500_000_000} stroke="hsl(var(--accent))" strokeDasharray="4 4" label={{ value: 'R$500M', fill: 'hsl(var(--accent))', fontSize: 10 }} />}
            {showRef(1_000_000_000) && <ReferenceLine y={1_000_000_000} stroke="hsl(var(--accent))" strokeDasharray="4 4" label={{ value: 'R$1B', fill: 'hsl(var(--accent))', fontSize: 10 }} />}
            <Line type="monotone" dataKey="Valuation" stroke="hsl(var(--accent))" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="Investimento acumulado" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
