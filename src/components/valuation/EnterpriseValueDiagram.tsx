import { motion, type Variants } from 'framer-motion';
import { YearProjection } from '@/lib/dcfCalculator';
import { formatFullCurrency } from '@/lib/formatters';

interface EnterpriseValueDiagramProps {
  projections: YearProjection[];
  terminalValuePV: number;
  sumProjectedPV: number;
  enterpriseValue: number;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 }
  }
};

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const slideLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const slideRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
};

export const EnterpriseValueDiagram = ({
  projections,
  terminalValuePV,
  sumProjectedPV,
  enterpriseValue,
}: EnterpriseValueDiagramProps) => {
  return (
    <motion.div 
      className="flex flex-col items-center gap-4 py-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Enterprise Value - Top Box */}
      <motion.div 
        className="w-full max-w-md bg-gradient-to-r from-accent to-accent/80 rounded-xl p-4 text-center shadow-lg"
        variants={scaleIn}
      >
        <p className="text-accent-foreground/80 text-xs font-medium mb-1">ENTERPRISE VALUE</p>
        <p className="text-2xl sm:text-3xl font-bold text-accent-foreground">
          {formatFullCurrency(enterpriseValue)}
        </p>
      </motion.div>

      {/* Equals sign */}
      <motion.span 
        className="text-2xl font-bold text-muted-foreground"
        variants={fadeIn}
      >
        =
      </motion.span>

      {/* Sum Container */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
        {/* Sum of Projected PVs */}
        <motion.div 
          className="flex-1 max-w-[200px] bg-[#0F172A] rounded-xl p-4 text-center"
          variants={slideLeft}
        >
          <p className="text-white/60 text-xs mb-1">Σ VP dos FCFFs</p>
          <p className="text-lg font-bold text-accent">
            {formatFullCurrency(sumProjectedPV)}
          </p>
        </motion.div>

        {/* Plus sign */}
        <motion.span 
          className="text-2xl font-bold text-muted-foreground"
          variants={fadeIn}
        >
          +
        </motion.span>

        {/* Terminal Value PV */}
        <motion.div 
          className="flex-1 max-w-[200px] bg-[#0F172A] rounded-xl p-4 text-center"
          variants={slideRight}
        >
          <p className="text-white/60 text-xs mb-1">VP Valor Terminal</p>
          <p className="text-lg font-bold text-accent">
            {formatFullCurrency(terminalValuePV)}
          </p>
        </motion.div>
      </div>

      {/* Connector line */}
      <motion.div 
        className="w-px h-4 bg-border"
        variants={fadeIn}
      />

      {/* Individual Year PVs */}
      <motion.div 
        className="grid grid-cols-3 gap-2 w-full max-w-md"
        variants={containerVariants}
      >
        {projections.map((proj, index) => (
          <motion.div
            key={proj.year}
            className="bg-muted/50 border border-border rounded-lg p-3 text-center"
            variants={fadeIn}
            custom={index}
          >
            <p className="text-muted-foreground text-xs mb-1">VP FCFF Ano {proj.year}</p>
            <p className="text-sm font-semibold text-foreground">
              {formatFullCurrency(proj.presentValue)}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Formula text */}
      <motion.p 
        className="text-xs text-muted-foreground text-center mt-2"
        variants={fadeIn}
      >
        EV = VP(FCFF₁) + VP(FCFF₂) + VP(FCFF₃) + VP(Valor Terminal)
      </motion.p>
    </motion.div>
  );
};
