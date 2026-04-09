import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, Tooltip } from 'recharts';
import { formatFullCurrency } from '@/lib/formatters';
import { estimateBankCost, estimateVispeCost } from '@/lib/capitalScoring';

interface CapitalComparisonProps {
  amount: number;
  score: number;
}

export function CapitalComparison({ amount, score }: CapitalComparisonProps) {
  const months = 24;
  const bankTotal = estimateBankCost(amount, months);
  const vispeTotal = estimateVispeCost(amount, months, score);
  const savings = bankTotal - vispeTotal;

  const data = [
    { name: 'Banco Tradicional', value: bankTotal, fill: 'hsl(var(--muted-foreground))' },
    { name: 'Vispe', value: vispeTotal, fill: 'hsl(var(--accent))' },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Vispe vs Banco Tradicional
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compare o custo total em {months} meses para uma captação de {formatFullCurrency(amount)}
          </p>
        </div>

        <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-8">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} layout="vertical" barCategoryGap="30%">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 14, fill: 'hsl(var(--foreground))' }} />
              <Tooltip
                formatter={(value: number) => formatFullCurrency(value)}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={40}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
                <LabelList dataKey="value" position="right" formatter={(v: number) => formatFullCurrency(v)} style={{ fontSize: 13, fontWeight: 600, fill: 'hsl(var(--foreground))' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 text-center p-4 bg-accent/10 rounded-xl">
            <p className="text-sm text-muted-foreground">Economia estimada com a Vispe</p>
            <p className="text-3xl font-black text-accent">{formatFullCurrency(Math.max(0, savings))}</p>
            <p className="text-xs text-muted-foreground mt-1">em {months} meses • valores simulados</p>
          </div>
        </div>
      </div>
    </section>
  );
}
