import { motion } from 'framer-motion';
import { formatFullCurrency } from '@/lib/formatters';

interface TeaserFinancialsProps {
  annualRevenue: number | null;
  annualProfit: number | null;
  askingPrice: number | null;
  hidePrice: boolean | null;
}

const TeaserFinancials = ({ annualRevenue, annualProfit, askingPrice, hidePrice }: TeaserFinancialsProps) => {
  const margin = annualRevenue && annualProfit ? ((annualProfit / annualRevenue) * 100).toFixed(1) : null;
  const monthlyRevenue = annualRevenue ? annualRevenue / 12 : null;

  const cards = [
    {
      label: 'FATURAMENTO ANUAL',
      value: annualRevenue ? formatFullCurrency(annualRevenue) : null,
    },
    {
      label: 'LUCRO ANUAL',
      value: annualProfit ? formatFullCurrency(annualProfit) : null,
    },
    {
      label: 'MARGEM LÍQUIDA',
      value: margin ? `${margin}%` : null,
    },
    {
      label: 'FATURAMENTO MÉDIO MENSAL',
      value: monthlyRevenue ? formatFullCurrency(monthlyRevenue) : null,
    },
    {
      label: 'VALOR PEDIDO',
      value: hidePrice ? 'Sob Consulta' : askingPrice ? formatFullCurrency(askingPrice) : null,
    },
  ].filter((c) => c.value);

  if (cards.length === 0) return null;

  return (
    <section className="relative py-20 px-4 sm:px-8 bg-gray-950 overflow-hidden">
      {/* Subtle chart pattern background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl md:text-5xl font-black text-white text-center mb-16 uppercase tracking-wider"
        >
          Financeiro
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group"
            >
              <div className="gradient-gold rounded-2xl p-6 sm:p-8 shadow-gold transition-transform hover:scale-[1.02]">
                <p className="text-xs sm:text-sm font-bold text-gray-900/70 uppercase tracking-wider mb-3">
                  {card.label}
                </p>
                <p className="text-2xl sm:text-3xl font-black text-gray-900">
                  {card.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeaserFinancials;
