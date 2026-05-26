import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onStart: () => void;
}

const playfair = { fontFamily: "'Playfair Display', serif" };

const pillars = [
  { num: '01', tag: 'STATUS QUO', title: 'De onde você está', desc: 'Mapeamento profundo da sua estrutura atual e gargalos invisíveis.' },
  { num: '02', tag: 'VISION', title: 'Aonde quer chegar', desc: 'Definição clara da meta de valuation e posicionamento de saída.' },
  { num: '03', tag: 'STRATEGY', title: 'Como chegar lá', desc: 'O passo a passo tático para escalar valor real de mercado.' },
];

export const PlanoPerfeitoHero = ({ onStart }: Props) => {
  const scrollDown = () => {
    window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] w-full selection:bg-accent selection:text-[#0A0A0A]">
      <section className="relative w-full max-w-7xl px-6 md:px-12 py-24 min-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Background Decorative Element (Abstract Bridge/Path) */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
          <svg viewBox="0 0 400 800" preserveAspectRatio="none" className="w-full h-full stroke-accent fill-none" strokeWidth="0.5">
            <path d="M0,800 L400,0" />
            <path d="M50,800 L450,0" />
            <path d="M100,800 L500,0" />
            <path d="M150,800 L550,0" />
            <path d="M200,800 L600,0" />
          </svg>
        </div>

        {/* Content Top */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-3 mb-12">
            <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent))]" />
            <span className="text-[#FAFAF7] uppercase tracking-[0.25em] text-[10px] md:text-xs font-semibold">
              O Plano Perfeito
            </span>
          </div>

          <div className="max-w-5xl">
            <h1
              style={playfair}
              className="text-[#FAFAF7] text-5xl md:text-7xl lg:text-8xl leading-[1.05] mb-8 break-words"
            >
              Construa a ponte da sua empresa{' '}
              <span className="inline-block bg-accent text-[#0A0A0A] px-3 md:px-4 py-1 md:py-2 mt-2 leading-none">
                até o bilhão.
              </span>
            </h1>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mt-12">
              <button
                onClick={onStart}
                className="bg-accent text-[#0A0A0A] px-8 py-5 text-sm font-bold uppercase tracking-wider hover:bg-white transition-colors duration-300"
              >
                Construir meu Plano Perfeito
              </button>
              <button
                onClick={scrollDown}
                className="group flex items-center gap-3 text-[#FAFAF7] px-2 sm:px-8 py-5 text-sm font-bold uppercase tracking-wider"
              >
                <span className="border-b border-[#FAFAF7]/30 group-hover:border-accent transition-colors pb-0.5">
                  Ver como funciona
                </span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Content Bottom (Pillars) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="relative z-10 grid grid-cols-1 md:grid-cols-3 border-t border-[#FAFAF7]/10 mt-20 pt-10"
        >
          {pillars.map((p, i) => (
            <div
              key={p.num}
              className={`group py-6 ${i === 0 ? 'md:pr-12' : ''} ${i === 1 ? 'md:px-12 border-t md:border-t-0 md:border-x border-[#FAFAF7]/10' : ''} ${i === 2 ? 'md:pl-12 border-t md:border-t-0 border-[#FAFAF7]/10' : ''}`}
            >
              <span className="block text-accent font-mono text-xs mb-4 tracking-wider">
                {p.num} — {p.tag}
              </span>
              <h3 style={playfair} className="text-[#FAFAF7] text-xl mb-2 break-words">
                {p.title}
              </h3>
              <p className="text-[#FAFAF7]/50 text-sm leading-relaxed max-w-xs break-words">
                {p.desc}
              </p>
            </div>
          ))}
        </motion.div>
      </section>
    </div>
  );
};
