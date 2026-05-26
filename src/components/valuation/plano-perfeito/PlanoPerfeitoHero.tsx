import { ArrowRight, ArrowDown, Activity, Eye, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onStart: () => void;
}

const VOLT = '#D9F564';
const CARBON = '#0A0A0A';
const BONE = '#FAFAF7';

const pillars = [
  {
    num: '01',
    tag: 'STATUS QUO',
    title: 'De onde você está',
    desc: 'Mapeamento profundo da sua estrutura atual e gargalos invisíveis que destroem valor.',
  },
  {
    num: '02',
    tag: 'VISION',
    title: 'Aonde quer chegar',
    desc: 'Definição clara da meta de valuation, janela de saída e posicionamento de mercado.',
  },
  {
    num: '03',
    tag: 'STRATEGY',
    title: 'Como chegar lá',
    desc: 'O passo a passo tático, mês a mês, para escalar valor real até o ponto de saída.',
  },
];

const liveStats = [
  { label: 'CNPJs analisados', value: '21.438.236', icon: Eye },
  { label: 'Em janela de venda', value: '1.248', accent: true, icon: Activity },
  { label: 'Volume mapeado', value: 'R$ 4,2 bi', icon: Sparkles },
];

export const PlanoPerfeitoHero = ({ onStart }: Props) => {
  const scrollToPillars = () => {
    const el = document.getElementById('plano-perfeito-pilares');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden selection:text-[#0A0A0A]"
      style={{ backgroundColor: CARBON, ['--volt' as any]: VOLT, ['--bone' as any]: BONE }}
    >
      {/* ============ BACKGROUND LAYERS ============ */}
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${BONE} 1px, transparent 1px), linear-gradient(90deg, ${BONE} 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />
      {/* Diagonal Volt bridge lines, edge-to-edge right */}
      <div className="absolute top-0 right-0 w-2/3 h-full opacity-[0.08] pointer-events-none">
        <svg viewBox="0 0 600 1000" preserveAspectRatio="none" className="w-full h-full fill-none" stroke={VOLT} strokeWidth="0.6">
          <path d="M0,1000 L600,0" />
          <path d="M80,1000 L680,0" />
          <path d="M160,1000 L760,0" />
          <path d="M240,1000 L840,0" />
          <path d="M320,1000 L920,0" />
          <path d="M400,1000 L1000,0" />
        </svg>
      </div>
      {/* Volt radial glow */}
      <div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.08] pointer-events-none blur-3xl"
        style={{ backgroundColor: VOLT }}
      />

      {/* ============ TOP MARGINALIA ============ */}
      <div className="hidden md:flex absolute top-6 left-6 lg:left-10 right-6 lg:right-10 items-center justify-between z-20 pointer-events-none font-mono text-[10px] tracking-[0.25em] uppercase">
        <div className="flex items-center gap-3" style={{ color: VOLT }}>
          <span>[ 01 / 03 ]</span>
          <span className="h-px w-12" style={{ backgroundColor: VOLT, opacity: 0.4 }} />
          <span>O Plano Perfeito</span>
        </div>
        <div className="flex items-center gap-3" style={{ color: `${BONE}66` }}>
          <span>Valuation · 2026</span>
          <span className="h-px w-12" style={{ backgroundColor: BONE, opacity: 0.2 }} />
          <span>LAT −23.55 · LNG −46.63</span>
        </div>
      </div>

      {/* ============ LEFT EDGE WORDMARK (vertical) ============ */}
      <div
        className="hidden lg:block absolute left-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none font-mono text-[10px] tracking-[0.4em] uppercase"
        style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)', color: `${BONE}55` }}
      >
        Vispecapital · mari designed forward
      </div>

      {/* ============ RIGHT EDGE RULER (00 — 03) ============ */}
      <div className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex-col items-center gap-3 font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: `${BONE}40` }}>
        <span>00</span>
        <span className="h-10 w-px" style={{ backgroundColor: BONE, opacity: 0.2 }} />
        <span style={{ color: VOLT }}>01</span>
        <span className="h-10 w-px" style={{ backgroundColor: BONE, opacity: 0.2 }} />
        <span>02</span>
        <span className="h-10 w-px" style={{ backgroundColor: BONE, opacity: 0.2 }} />
        <span>03</span>
      </div>

      {/* ============ MAIN CONTENT (edge-to-edge) ============ */}
      <div className="relative z-10 w-full px-6 md:px-10 lg:px-16 pt-24 md:pt-28 lg:pt-32 pb-10 min-h-screen flex flex-col">
        {/* ─── HERO ROW ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-start flex-1"
        >
          {/* LEFT: Headline cols 1-7 */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="flex items-center gap-3 mb-8 lg:mb-12">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: VOLT, boxShadow: `0 0 14px ${VOLT}` }}
              />
              <span className="uppercase tracking-[0.3em] text-[10px] md:text-xs font-semibold" style={{ color: BONE }}>
                O Plano Perfeito
              </span>
              <span className="h-px flex-1 max-w-[120px]" style={{ backgroundColor: `${BONE}22` }} />
            </div>

            <h1
              className="font-bold tracking-tighter text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[8.5rem] leading-[0.95] break-words"
              style={{ color: BONE }}
            >
              Construa a ponte
              <br />
              da sua empresa
              <br />
              <span
                className="inline-block px-3 md:px-5 py-1 md:py-2 mt-3 md:mt-4 leading-none"
                style={{ backgroundColor: VOLT, color: CARBON }}
              >
                até o bilhão.
              </span>
            </h1>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 mt-10 lg:mt-14">
              <div className="flex flex-col items-start gap-2">
                <button
                  onClick={onStart}
                  className="px-8 py-5 text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:opacity-90 hover:translate-x-1"
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
                className="group flex items-center gap-3 px-2 sm:px-4 py-5 text-sm font-bold uppercase tracking-wider"
                style={{ color: BONE }}
              >
                <span className="border-b pb-0.5 transition-colors" style={{ borderColor: `${BONE}4D` }}>
                  Ver como funciona
                </span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* RIGHT: Mari · ao vivo card cols 8-12 */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-5 xl:col-span-4 lg:mt-4"
          >
            <div
              className="relative p-6 lg:p-7 backdrop-blur-md"
              style={{
                backgroundColor: `${BONE}06`,
                border: `1px solid ${BONE}1A`,
                boxShadow: `inset 0 1px 0 ${BONE}0A`,
              }}
            >
              {/* corner tick */}
              <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: VOLT }} />
              <span className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: VOLT }} />
              <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: VOLT }} />
              <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: VOLT }} />

              <div className="flex items-center justify-between mb-6 font-mono text-[10px] tracking-[0.25em] uppercase">
                <div className="flex items-center gap-2" style={{ color: BONE }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: VOLT }} />
                  Mari · Ao Vivo
                </div>
                <span style={{ color: `${BONE}40` }}>SCAN.01</span>
              </div>

              <div className="space-y-4">
                {liveStats.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.label}
                      className="flex items-center justify-between py-3 border-b last:border-b-0"
                      style={{ borderColor: `${BONE}10` }}
                    >
                      <div className="flex items-center gap-3 text-sm" style={{ color: `${BONE}A0` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: `${BONE}60` }} />
                        {s.label}
                      </div>
                      <span
                        className="font-mono text-lg font-semibold tabular-nums"
                        style={{ color: s.accent ? VOLT : BONE }}
                      >
                        {s.value}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-5" style={{ borderTop: `1px dashed ${BONE}1A` }}>
                <p className="text-xs leading-relaxed mb-3" style={{ color: `${BONE}80` }}>
                  <span style={{ color: VOLT }}>●</span>{' '}
                  Mari está olhando para a sua empresa <span style={{ color: VOLT }}>agora</span>. Descubra em 60 segundos se você está em janela.
                </p>
                <button
                  onClick={onStart}
                  className="group flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"
                  style={{ color: VOLT }}
                >
                  Analisar meu CNPJ
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.aside>
        </motion.div>

        {/* ─── PILLARS ROW (edge-to-edge with giant outline numbers) ─── */}
        <motion.div
          id="plano-perfeito-pilares"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="relative mt-16 lg:mt-24 scroll-mt-24"
        >
          {/* full-bleed top border */}
          <div
            className="absolute -left-6 -right-6 md:-left-10 md:-right-10 lg:-left-16 lg:-right-16 top-0 h-px"
            style={{ backgroundColor: `${BONE}1A` }}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 pt-10">
            {pillars.map((p, i) => (
              <div
                key={p.num}
                className={`relative group py-8 px-0 md:px-8 lg:px-10 overflow-hidden ${
                  i > 0 ? 'border-t md:border-t-0 md:border-l' : ''
                }`}
                style={{ borderColor: `${BONE}1A` }}
              >
                {/* Giant outline number */}
                <span
                  aria-hidden
                  className="absolute -top-6 -right-2 md:-right-4 text-[140px] md:text-[180px] lg:text-[220px] leading-none font-black select-none pointer-events-none"
                  style={{
                    color: 'transparent',
                    WebkitTextStroke: `1px ${BONE}10`,
                    fontFamily: 'inherit',
                  }}
                >
                  {p.num}
                </span>

                <div className="relative">
                  <span
                    className="block font-mono text-xs mb-5 tracking-[0.25em] uppercase"
                    style={{ color: VOLT }}
                  >
                    {p.num} — {p.tag}
                  </span>
                  <h3
                    className="font-bold tracking-tight text-2xl md:text-3xl mb-3 break-words"
                    style={{ color: BONE }}
                  >
                    {p.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed max-w-sm break-words"
                    style={{ color: `${BONE}80` }}
                  >
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── BOTTOM MARGINALIA ─── */}
        <div className="hidden md:flex items-center justify-between mt-12 font-mono text-[10px] tracking-[0.25em] uppercase pointer-events-none">
          <div className="flex items-center gap-3" style={{ color: `${BONE}40` }}>
            <span className="h-px w-12" style={{ backgroundColor: BONE, opacity: 0.15 }} />
            <span>Vispecapital · mari</span>
          </div>
          <button
            onClick={scrollToPillars}
            className="group flex items-center gap-3 pointer-events-auto transition-colors hover:text-[var(--volt)]"
            style={{ color: `${BONE}66` }}
          >
            <span>Scroll · ver metodologia</span>
            <ArrowDown className="w-3 h-3 animate-bounce" />
          </button>
        </div>
      </div>

      {/* Smooth fade into next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[5]"
        style={{ background: `linear-gradient(to bottom, transparent, ${CARBON})` }}
      />
    </div>
  );
};
