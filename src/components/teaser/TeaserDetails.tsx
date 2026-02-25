import { motion } from 'framer-motion';
import { Ruler, Home, Receipt, FileText } from 'lucide-react';
import { formatFullCurrency } from '@/lib/formatters';

const saleReasonLabels: Record<string, string> = {
  retirement: 'Aposentadoria',
  relocation: 'Mudança de cidade/país',
  partners: 'Desentendimento entre sócios',
  new_business: 'Novo negócio/oportunidade',
  health: 'Problemas de saúde',
  family: 'Motivos familiares',
  burnout: 'Cansaço/Esgotamento',
  capital: 'Necessidade de capital',
  other: 'Outro motivo',
};

interface TeaserDetailsProps {
  squareMeters: number | null;
  rentValue: number | null;
  iptuValue: number | null;
  saleReason: string | null;
}

const TeaserDetails = ({ squareMeters, rentValue, iptuValue, saleReason }: TeaserDetailsProps) => {
  const hasData = squareMeters || rentValue || iptuValue || saleReason;
  if (!hasData) return null;

  const items = [
    { icon: Ruler, label: 'Área', value: squareMeters ? `${squareMeters} m²` : null },
    { icon: Home, label: 'Aluguel', value: rentValue ? `${formatFullCurrency(rentValue)}/mês` : null },
    { icon: Receipt, label: 'IPTU', value: iptuValue ? `${formatFullCurrency(iptuValue)}/mês` : null },
    { icon: FileText, label: 'Motivo da Venda', value: saleReason ? saleReasonLabels[saleReason] || saleReason : null },
  ].filter((i) => i.value);

  return (
    <section className="relative py-20 px-4 sm:px-8 bg-gray-900 overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl md:text-5xl font-black text-white text-center mb-16 uppercase tracking-wider"
        >
          Detalhes do Ponto
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {items.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-2xl p-6 flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center flex-shrink-0">
                <item.icon className="w-6 h-6 text-gray-900" />
              </div>
              <div>
                <p className="text-sm text-white/50 uppercase tracking-wider font-semibold mb-1">
                  {item.label}
                </p>
                <p className="text-xl font-bold text-white">{item.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeaserDetails;
