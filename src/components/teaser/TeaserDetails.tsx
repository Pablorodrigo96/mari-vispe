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
    { icon: Ruler, label: 'Área Total', value: squareMeters ? `${squareMeters}` : null, suffix: 'm²' },
    { icon: Home, label: 'Aluguel', value: rentValue ? formatFullCurrency(rentValue) : null, suffix: '/mês' },
    { icon: Receipt, label: 'IPTU', value: iptuValue ? formatFullCurrency(iptuValue) : null, suffix: '/mês' },
    { icon: FileText, label: 'Motivo da Venda', value: saleReason ? saleReasonLabels[saleReason] || saleReason : null, suffix: '' },
  ].filter((i) => i.value);

  return (
    <section className="relative py-24 px-4 sm:px-8 bg-gray-900 overflow-hidden">
      {/* Subtle city skyline pattern */}
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-5">
        <svg viewBox="0 0 1200 120" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,120 L0,80 L40,80 L40,60 L60,60 L60,40 L80,40 L80,60 L100,60 L100,80 L120,80 L120,50 L140,50 L140,30 L160,30 L160,50 L180,50 L180,70 L200,70 L200,90 L240,90 L240,60 L260,60 L260,20 L280,20 L280,60 L300,60 L300,80 L340,80 L340,40 L360,40 L360,10 L380,10 L380,40 L400,40 L400,70 L440,70 L440,50 L460,50 L460,80 L500,80 L500,60 L520,60 L520,30 L540,30 L540,60 L560,60 L560,80 L600,80 L600,40 L620,40 L620,70 L660,70 L660,50 L680,50 L680,80 L720,80 L720,60 L740,60 L740,20 L760,20 L760,60 L780,60 L780,80 L820,80 L820,50 L840,50 L840,70 L880,70 L880,40 L900,40 L900,70 L940,70 L940,80 L980,80 L980,60 L1000,60 L1000,40 L1020,40 L1020,60 L1040,60 L1040,80 L1080,80 L1080,50 L1100,50 L1100,30 L1120,30 L1120,50 L1140,50 L1140,80 L1200,80 L1200,120 Z" fill="white" />
        </svg>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-wider">
            Detalhes do Ponto
          </h2>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        </motion.div>

        <div className={`grid gap-6 max-w-4xl mx-auto ${items.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
          {items.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12, type: 'spring', stiffness: 150 }}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 30px hsla(38, 92%, 50%, 0.25)',
                transition: { duration: 0.25 },
              }}
              className="relative overflow-hidden rounded-2xl group cursor-default"
            >
              {/* Header */}
              <div className="bg-gray-800/90 px-5 py-4 flex items-center gap-3">
                <motion.div
                  whileHover={{ rotate: 10 }}
                  className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center"
                >
                  <item.icon className="w-4 h-4 text-gray-900" />
                </motion.div>
                <span className="text-xs font-bold text-amber-500/80 uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
              {/* Body */}
              <div className="bg-gray-800/50 px-5 py-6 border-t border-amber-500/10 relative overflow-hidden">
                <p className="text-2xl sm:text-3xl font-black text-white relative z-10">
                  {item.value}
                  {item.suffix && (
                    <span className="text-base font-medium text-white/40 ml-1">{item.suffix}</span>
                  )}
                </p>
                {/* Glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-amber-500/5 to-transparent" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeaserDetails;
