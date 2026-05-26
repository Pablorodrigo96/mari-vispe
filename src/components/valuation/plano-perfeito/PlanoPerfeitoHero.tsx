import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onStart: () => void;
}

const VOLT = '#D9F564';
const CARBON = '#0A0A0A';
const BONE = '#FAFAF7';

const pillars = [
  { num: '01', tag: 'STATUS QUO', title: 'De onde você está', desc: 'Mapeamento profundo da sua estrutura atual e gargalos invisíveis.' },
  { num: '02', tag: 'VISION', title: 'Aonde quer chegar', desc: 'Definição clara da meta de valuation e posicionamento de saída.' },
  { num: '03', tag: 'STRATEGY', title: 'Como chegar lá', desc: 'O passo a passo tático para escalar valor real de mercado.' },
];

export const PlanoPerfeitoHero = ({ onStart }: Props) => {
  const scrollToPillars = () => {
    const el = document.getElementById('plano-perfeito-pilares');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center w-full selection:text-[#0A0A0A]"
      style={{ backgroundColor: CARBON }}
    >
      <section className="relative w-full max-w-7xl px-6 md:px-12 py-24 min-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Background Decorative Element (Abstract Bridge/Path) */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
          <svg viewBox="0 0 400 800" preserveAspectRatio="none" className="w-full h-full fill-none" stroke={VOLT} strokeWidth="0.5">
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
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: VOLT, boxShadow: `0 0 12px ${VOLT}` }} />
            <span className="uppercase tracking-[0.25em] text-[10px] md:text-xs font-semibold" style={{ color: BONE }}>
              O Plano Perfeito
            </span>
          </div>

          <div className="max-w-5xl">
            <h1
              className="font-bold tracking-tight text-5xl md:text-7xl lg:text-8xl leading-[1.05] mb-8 break-words"
              style={{ color: BONE }}
            >
              Construa a ponte da sua empresa{' '}
              <span
                className="inline-block px-3 md:px-4 py-1 md:py-2 mt-2 leading-none"
                style={{ backgroundColor: VOLT, color: CARBON }}
              >
                até o bilhão.
              </span>
            </h1>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mt-12">
              <div className="flex flex-col items-start gap-2">
                <button
                  onClick={onStart}
                  className="px-8 py-5 text-sm font-bold uppercase tracking-wider transition-colors duration-300 hover:opacity-90"
                  style={{ backgroundColor: VOLT, color: CARBON }}
                >
                  Construir meu Plano Perfeito
                </button>
                <span className="flex items-center gap-2 text-xs pl-1" style={{ color: `${BONE}B3` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: VOLT }} />
                  100% gratuito — teste agora
                </span>
              </div>
              <button
                onClick={scrollToPillars}
                className="group flex items-center gap-3 px-2 sm:px-8 py-5 text-sm font-bold uppercase tracking-wider self-start sm:self-auto"
                style={{ color: BONE }}
              >
                <span className="border-b pb-0.5 transition-colors" style={{ borderColor: `${BONE}4D` }}>
                  Ver como funciona
                </span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Content Bottom (Pillars) */}
        <motion.div
          id="plano-perfeito-pilares"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="relative z-10 grid grid-cols-1 md:grid-cols-3 mt-20 pt-10 scroll-mt-24"
          style={{ borderTop: `1px solid ${BONE}1A` }}
        >
          {pillars.map((p, i) => (
            <div
              key={p.num}
              className={`group py-6 ${i === 0 ? 'md:pr-12' : ''} ${i === 1 ? 'md:px-12 border-t md:border-t-0 md:border-x' : ''} ${i === 2 ? 'md:pl-12 border-t md:border-t-0' : ''}`}
              style={i > 0 ? { borderColor: `${BONE}1A` } : undefined}
            >
              <span className="block font-mono text-xs mb-4 tracking-wider" style={{ color: VOLT }}>
                {p.num} — {p.tag}
              </span>
              <h3 className="font-bold tracking-tight text-xl mb-2 break-words" style={{ color: BONE }}>
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed max-w-xs break-words" style={{ color: `${BONE}80` }}>
                {p.desc}
              </p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Smooth fade into next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[5]"
        style={{ background: `linear-gradient(to bottom, transparent, ${CARBON})` }}
      />
    </div>
  );
};
