import { motion } from 'framer-motion';
import { formatFullCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { TrendingUp, Percent, DollarSign, Target } from 'lucide-react';

interface TeaserFinancialsProps {
  annualRevenue: number | null;
  annualProfit: number | null;
  askingPrice: number | null;
  hidePrice: boolean | null;
}

const TeaserFinancials = ({ annualRevenue, annualProfit, askingPrice, hidePrice }: TeaserFinancialsProps) => {
  const margin = annualRevenue && annualProfit ? ((annualProfit / annualRevenue) * 100).toFixed(1) : null;
  const monthlyRevenue = annualRevenue ? annualRevenue / 12 : null;

  const hasAnyData = annualRevenue || annualProfit || askingPrice;
  if (!hasAnyData) return null;

  // Chart data: 3-year projection
  const chartData = annualRevenue
    ? [
        { name: 'Ano -2', value: annualRevenue * 0.82 },
        { name: 'Ano -1', value: annualRevenue * 0.91 },
        { name: 'Atual', value: annualRevenue },
      ]
    : [];

  const kpis = [
    {
      icon: DollarSign,
      label: 'Faturamento Anual',
      value: annualRevenue ? formatFullCurrency(annualRevenue) : null,
    },
    {
      icon: TrendingUp,
      label: 'Lucro Anual',
      value: annualProfit ? formatFullCurrency(annualProfit) : null,
    },
    {
      icon: Percent,
      label: 'Margem Líquida',
      value: margin ? `${margin}%` : null,
    },
    {
      icon: DollarSign,
      label: 'Fat. Médio Mensal',
      value: monthlyRevenue ? formatFullCurrency(monthlyRevenue) : null,
    },
    {
      icon: Target,
      label: 'Valor Pedido',
      value: hidePrice ? 'Sob Consulta' : askingPrice ? formatFullCurrency(askingPrice) : null,
    },
  ].filter((k) => k.value);

  const CustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width / 2}
        y={y - 10}
        fill="hsla(38, 92%, 60%, 0.9)"
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
      >
        {formatFullCurrency(value)}
      </text>
    );
  };

  return (
    <section className="relative py-24 px-4 sm:px-8 bg-gray-950 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-wider">
            Financeiro
          </h2>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Chart */}
          {chartData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass-card rounded-2xl p-6 sm:p-8"
            >
              <h3 className="text-lg font-bold text-white/80 mb-2">Evolução do Faturamento</h3>
              <p className="text-sm text-white/40 mb-6">Últimos 3 anos (estimativa)</p>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barCategoryGap="30%">
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsla(0,0%,100%,0.5)', fontSize: 12 }}
                    />
                    <YAxis hide />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60}>
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === chartData.length - 1
                              ? 'hsl(38, 92%, 50%)'
                              : `hsla(38, 70%, 50%, ${0.25 + index * 0.2})`
                          }
                        />
                      ))}
                      <LabelList content={<CustomLabel />} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {kpis.map((kpi, index) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative overflow-hidden rounded-2xl"
              >
                {/* Dark header with gold label */}
                <div className="bg-gray-800/80 px-5 py-3 flex items-center gap-2">
                  <kpi.icon className="w-4 h-4 text-amber-500/70" />
                  <span className="text-xs font-bold text-amber-500/80 uppercase tracking-wider">
                    {kpi.label}
                  </span>
                </div>
                {/* Value body */}
                <div className="gradient-gold px-5 py-5">
                  <p className="text-xl sm:text-2xl font-black text-gray-900">
                    {kpi.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TeaserFinancials;
