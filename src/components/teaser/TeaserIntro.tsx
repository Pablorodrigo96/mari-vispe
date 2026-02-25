import { motion } from 'framer-motion';
import { getCategoryLabel } from '@/lib/formatters';
import BrazilMap from './BrazilMap';

interface TeaserIntroProps {
  description: string | null;
  category: string | null;
  foundationYear: number | null;
  city: string | null;
  state: string | null;
}

const TeaserIntro = ({ description, category, foundationYear, city, state }: TeaserIntroProps) => {
  const introText = (() => {
    const parts: string[] = [];
    if (foundationYear) parts.push(`Fundada em ${foundationYear}`);
    if (category) parts.push(`a empresa atua no segmento de ${getCategoryLabel(category)}`);
    if (city && state) parts.push(`na região de ${city} (${state})`);
    else if (state) parts.push(`no estado de ${state}`);
    return parts.length > 0 ? parts.join(', ') + '.' : '';
  })();

  return (
    <section className="relative py-24 px-4 sm:px-8 bg-gray-950 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-wider">
            Introdução
          </h2>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-16 items-start">
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
              <p className="text-base sm:text-lg text-white/60 leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            )}

            {/* Category & Year badges */}
            <div className="flex flex-wrap gap-3 pt-4">
              {category && (
                <span className="px-4 py-2 rounded-full border border-amber-500/20 bg-amber-500/5 text-sm font-semibold text-amber-400/80">
                  {getCategoryLabel(category)}
                </span>
              )}
              {foundationYear && (
                <span className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white/60">
                  Desde {foundationYear}
                </span>
              )}
            </div>
          </motion.div>

          {/* 3D Brazil Map */}
          <div className="md:col-span-2">
            <BrazilMap highlightState={state} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default TeaserIntro;
