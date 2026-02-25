import { motion } from 'framer-motion';

interface TeaserHeroProps {
  ticker: string;
}

const TeaserHero = ({ ticker }: TeaserHeroProps) => {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-gray-950">
      {/* Background money texture overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDE4SDI0djEySDE4djZoNnYxMmgxMlYzNmg2di02aC02VjE4eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

      {/* Gold decorative arc - inspired by PDF */}
      <div className="absolute left-0 top-0 bottom-0 w-[500px]">
        <svg viewBox="0 0 500 800" className="h-full w-full" preserveAspectRatio="xMinYMid slice">
          <path
            d="M 350 0 Q 0 200, 100 400 Q 200 600, 350 800"
            fill="none"
            stroke="hsl(38, 92%, 50%)"
            strokeWidth="2"
            opacity="0.6"
          />
          <path
            d="M 380 0 Q 30 200, 130 400 Q 230 600, 380 800"
            fill="none"
            stroke="hsl(38, 92%, 45%)"
            strokeWidth="1.5"
            opacity="0.4"
          />
        </svg>
      </div>

      <div className="relative z-10 text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl sm:text-7xl md:text-8xl font-black text-white tracking-tight"
        >
          Blind Teaser
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-white/90 mt-2 tracking-widest font-mono"
        >
          {ticker}
        </motion.p>
      </div>

      {/* Bottom-right PME.B3 branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-8 right-8 flex items-center gap-2"
      >
        <span className="text-sm font-semibold tracking-wider text-white/60">PME.B3</span>
      </motion.div>
    </section>
  );
};

export default TeaserHero;
