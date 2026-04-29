import { motion } from 'framer-motion';
import { TrendingUp, Eye } from 'lucide-react';
import { MariBrandStamp } from '@/components/brand/MariBrandStamp';

interface TeaserHeroProps {
  ticker: string;
  totalViews?: number;
  uniqueViews?: number;
}

const TeaserHero = ({ ticker, totalViews = 0, uniqueViews = 0 }: TeaserHeroProps) => {
  return (
    <section className="relative min-h-[60vh] sm:min-h-[80vh] flex items-center justify-center overflow-hidden bg-gray-950">
      {/* Multi-layer background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-grid-pattern opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsla(38,92%,50%,0.06)_0%,_transparent_70%)]" />
      </div>

      {/* Left gold decorative arcs */}
      <div className="absolute left-0 top-0 bottom-0 w-[200px] sm:w-[600px] pointer-events-none opacity-30 sm:opacity-100">
        <svg viewBox="0 0 600 900" className="h-full w-full" preserveAspectRatio="xMinYMid slice">
          <motion.path
            d="M 450 0 Q -50 250, 150 450 Q 350 650, 450 900"
            fill="none" stroke="hsl(38, 92%, 50%)" strokeWidth="2.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
          <motion.path
            d="M 500 0 Q 0 250, 200 450 Q 400 650, 500 900"
            fill="none" stroke="hsl(38, 92%, 45%)" strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{ duration: 2.5, ease: 'easeInOut', delay: 0.3 }}
          />
          <motion.path
            d="M 400 0 Q -100 250, 100 450 Q 300 650, 400 900"
            fill="none" stroke="hsl(38, 92%, 55%)" strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.25 }}
            transition={{ duration: 3, ease: 'easeInOut', delay: 0.6 }}
          />
        </svg>
      </div>

      {/* Right gold arc */}
      <div className="absolute right-0 top-0 bottom-0 w-[300px] pointer-events-none opacity-30 hidden sm:block">
        <svg viewBox="0 0 300 900" className="h-full w-full" preserveAspectRatio="xMaxYMid slice">
          <motion.path
            d="M 50 0 Q 350 300, 150 450 Q -50 600, 50 900"
            fill="none" stroke="hsl(38, 92%, 50%)" strokeWidth="1.5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, delay: 1 }}
          />
        </svg>
      </div>

      {/* Floating particles - 12 with varied sizes */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full bg-amber-500/30 ${i % 2 === 0 ? '' : 'hidden sm:block'}`}
          style={{
            width: `${2 + (i % 4)}px`,
            height: `${2 + (i % 4)}px`,
            left: `${8 + i * 7.5}%`,
            top: `${15 + (i % 5) * 18}%`,
          }}
          animate={{
            y: [-15, 15, -15],
            x: [-(i % 3) * 3, (i % 3) * 3, -(i % 3) * 3],
            opacity: [0.15, 0.55, 0.15],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 3.5 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.2,
          }}
        />
      ))}

      <div className="relative z-10 text-center px-4">
        {/* Subtle label */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500/60" />
          <span className="text-xs font-semibold text-amber-500/70 uppercase tracking-[0.3em]">
            Oportunidade Exclusiva
          </span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/60" />
        </motion.div>

        {/* Shimmer title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl sm:text-5xl md:text-7xl lg:text-9xl font-black text-white tracking-tight relative"
        >
          <span className="relative inline-block">
            Blind Teaser
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
              style={{ WebkitBackgroundClip: 'text', mixBlendMode: 'overlay' }}
            />
          </span>
        </motion.h1>

        {/* Ticker badge with pulse */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-8 py-2 sm:py-3 rounded-full border border-amber-500/30 bg-amber-500/5 relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-amber-500/20"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-2xl sm:text-3xl md:text-5xl font-black text-gradient-gold tracking-[0.15em] font-mono relative z-10">
            {ticker}
          </span>
        </motion.div>

        {/* View counter badge */}
        {totalViews > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5"
          >
            <Eye className="w-3.5 h-3.5 text-amber-500/70" />
            <span className="text-xs text-white/50 font-medium">
              {totalViews} visualizações • {uniqueViews} únicos
            </span>
          </motion.div>
        )}

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mx-auto mt-10 h-px w-32 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
        />
      </div>

      {/* Bottom branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 right-8 hidden sm:flex items-center gap-3"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center"
        >
          <TrendingUp className="w-4 h-4 text-gray-900" />
        </motion.div>
        <span className="text-sm font-bold tracking-[0.2em] text-white/50">mari</span>
      </motion.div>
    </section>
  );
};

export default TeaserHero;
