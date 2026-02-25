import { motion } from 'framer-motion';
import { getCategoryLabel } from '@/lib/formatters';

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
    <section className="relative py-20 px-4 sm:px-8 bg-gray-950 overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDE4SDI0djEySDE4djZoNnYxMmgxMlYzNmg2di02aC02VjE4eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl md:text-5xl font-black text-white text-center mb-12 uppercase tracking-wider"
        >
          Introdução
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-start">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="md:col-span-3 space-y-6"
          >
            {introText && (
              <p className="text-lg sm:text-xl text-white/90 leading-relaxed">
                {introText}
              </p>
            )}
            {description && (
              <p className="text-base sm:text-lg text-white/70 leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            )}
          </motion.div>

          {/* State badge */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="md:col-span-2 flex items-center justify-center"
          >
            {state && (
              <div className="relative">
                <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full gradient-gold flex items-center justify-center shadow-gold">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Operação em
                    </p>
                    <div className="w-12 h-0.5 bg-gray-900/30 mx-auto my-2" />
                    <p className="text-5xl sm:text-6xl font-black text-gray-900">
                      {state}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TeaserIntro;
