import { motion } from 'framer-motion';

interface BrazilMapProps {
  highlightState?: string | null;
}

// Simplified SVG paths for Brazilian states
const statePaths: Record<string, string> = {
  AC: 'M95,340 L95,365 L120,365 L120,340 Z',
  AM: 'M100,260 L100,335 L200,335 L200,280 L175,260 Z',
  RR: 'M155,210 L155,255 L190,255 L190,210 Z',
  AP: 'M250,215 L250,260 L280,260 L280,230 L265,215 Z',
  PA: 'M205,250 L205,320 L300,320 L300,270 L275,250 Z',
  MA: 'M305,275 L305,320 L350,320 L350,290 L335,275 Z',
  PI: 'M340,290 L340,350 L370,350 L370,290 Z',
  CE: 'M370,275 L370,320 L400,320 L400,275 Z',
  RN: 'M400,280 L400,305 L425,305 L425,280 Z',
  PB: 'M395,305 L395,320 L425,320 L425,305 Z',
  PE: 'M375,320 L375,340 L425,340 L425,320 Z',
  AL: 'M400,340 L400,358 L420,358 L420,340 Z',
  SE: 'M395,358 L395,375 L415,375 L415,358 Z',
  BA: 'M325,325 L325,410 L400,410 L400,355 L375,340 L375,325 Z',
  TO: 'M290,320 L290,390 L325,390 L325,320 Z',
  GO: 'M270,380 L270,430 L330,430 L330,380 Z',
  DF: 'M310,400 L310,415 L325,415 L325,400 Z',
  MT: 'M200,335 L200,410 L275,410 L275,380 L270,335 Z',
  MS: 'M230,410 L230,475 L285,475 L285,430 L270,410 Z',
  MG: 'M310,385 L310,455 L385,455 L385,400 L350,385 Z',
  ES: 'M385,405 L385,440 L410,440 L410,405 Z',
  RJ: 'M365,445 L365,465 L400,465 L400,445 Z',
  SP: 'M290,435 L290,480 L365,480 L365,455 L330,435 Z',
  PR: 'M265,475 L265,510 L330,510 L330,475 Z',
  SC: 'M280,510 L280,535 L325,535 L325,510 Z',
  RS: 'M260,535 L260,590 L315,590 L315,535 Z',
  RO: 'M135,340 L135,390 L195,390 L195,340 Z',
};

const stateNames: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso',
  PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RO: 'Rondônia', RR: 'Roraima',
  RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins',
};

const BrazilMap = ({ highlightState }: BrazilMapProps) => {
  const normalized = highlightState?.toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative"
      style={{ perspective: '800px' }}
    >
      <div
        className="transition-transform duration-700"
        style={{ transform: 'rotateX(12deg) rotateY(-10deg)' }}
      >
        <svg
          viewBox="80 200 370 410"
          className="w-full h-auto max-w-[320px] mx-auto drop-shadow-2xl"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background glow for highlighted state */}
          {normalized && statePaths[normalized] && (
            <motion.circle
              cx="270"
              cy="400"
              r="180"
              fill="url(#mapGlow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
            />
          )}

          <defs>
            <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(38, 92%, 50%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(38, 92%, 50%)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(38, 92%, 55%)" />
              <stop offset="100%" stopColor="hsl(38, 92%, 45%)" />
            </linearGradient>
          </defs>

          {Object.entries(statePaths).map(([code, d]) => {
            const isHighlighted = code === normalized;
            return (
              <motion.path
                key={code}
                d={d}
                fill={isHighlighted ? 'url(#goldGrad)' : 'hsla(38, 70%, 50%, 0.15)'}
                stroke={isHighlighted ? 'hsl(38, 92%, 60%)' : 'hsla(38, 70%, 50%, 0.3)'}
                strokeWidth={isHighlighted ? 2 : 0.8}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.02 * Object.keys(statePaths).indexOf(code), duration: 0.3 }}
                className={isHighlighted ? 'drop-shadow-lg' : ''}
              />
            );
          })}
        </svg>
      </div>

      {/* State label */}
      {normalized && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6"
        >
          <div className="inline-flex items-center gap-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-500/60" />
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-[0.2em]">
                Operação em
              </p>
              <p className="text-2xl font-black text-white mt-1">
                {stateNames[normalized] || normalized}
              </p>
            </div>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-500/60" />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BrazilMap;
