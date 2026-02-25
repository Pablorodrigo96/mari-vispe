import { motion } from 'framer-motion';
import { getCategoryLabel } from '@/lib/formatters';
import { Award } from 'lucide-react';
import BrazilMap from './BrazilMap';

interface TeaserIntroProps {
  description: string | null;
  category: string | null;
  foundationYear: number | null;
  city: string | null;
  state: string | null;
  additionalInfo?: string | null;
}

const TeaserIntro = ({ description, category, foundationYear, city, state, additionalInfo }: TeaserIntroProps) => {
  const introText = (() => {
    const parts: string[] = [];
    if (foundationYear) parts.push(`Fundada em ${foundationYear}`);
    if (category) parts.push(`a empresa atua no segmento de ${getCategoryLabel(category)}`);
    if (city && state) parts.push(`na região de ${city} (${state})`);
    else if (state) parts.push(`no estado de ${state}`);
    return parts.length > 0 ? parts.join(', ') + '.' : '';
  })();

  return (
    <section className="relative py-12 sm:py-24 px-4 sm:px-8 bg-gray-950 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-wider">
            Introdução
          </h2>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-16 items-start">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="md:col-span-3 space-y-8"
          >
            {introText && (
              <p className="text-xl sm:text-2xl text-white/90 leading-relaxed font-light">
                {introText}
              </p>
            )}
            {description && (
              <p className="text-base sm:text-lg text-white/60 leading-relaxed break-words overflow-hidden" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                {description}
              </p>
            )}

            {/* Additional Info Block */}
            {additionalInfo && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
                    Informações Gerais
                  </h3>
                </div>
                <p className="text-base text-white/70 leading-relaxed break-words" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                  {additionalInfo}
                </p>
              </motion.div>
            )}

            {/* Category & Year badges */}
            <div className="flex flex-wrap gap-3 pt-4">
              {category && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.08, boxShadow: '0 0 20px hsla(38, 92%, 50%, 0.3)' }}
                  className="px-4 py-2 rounded-full border border-amber-500/20 bg-amber-500/5 text-sm font-semibold text-amber-400/80 cursor-default transition-colors duration-300"
                >
                  {getCategoryLabel(category)}
                </motion.span>
              )}
              {foundationYear && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.45 }}
                  whileHover={{ scale: 1.08 }}
                  className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white/60 cursor-default transition-colors duration-300"
                >
                  Desde {foundationYear}
                </motion.span>
              )}
            </div>
          </motion.div>

          {/* 3D Brazil Map */}
          <div className="md:col-span-2 mx-auto max-w-[280px] sm:max-w-[320px] md:max-w-none order-first md:order-last">
            <BrazilMap highlightState={state} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default TeaserIntro;
