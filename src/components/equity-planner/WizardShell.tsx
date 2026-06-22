import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Sparkles } from "lucide-react";
import { MariLogo } from "@/components/brand/MariLogo";
import WizardProgress from "./WizardProgress";

interface WizardShellProps {
  step: number;
  steps: { label: string; sub?: string }[];
  stepKey: string | number;
  children: ReactNode;
  footer?: ReactNode;
  statusChip?: ReactNode;
}

export default function WizardShell({ step, steps, stepKey, children, footer, statusChip }: WizardShellProps) {
  const pct = Math.round(((step + 1) / steps.length) * 100);
  return (
    <div className="min-h-[100dvh] bg-carbon text-bone relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_15%_0%,_hsla(72,86%,68%,0.10)_0%,_transparent_55%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_90%_100%,_hsla(72,86%,68%,0.06)_0%,_transparent_55%)]" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[40%_60%] min-h-[100dvh]">
        {/* ===== LEFT (desktop) ===== */}
        <aside className="hidden lg:flex flex-col justify-between bg-gradient-to-b from-carbon to-graphite/60 border-r border-white/5 p-10 xl:p-14">
          <div>
            <Link to="/" className="inline-flex items-center mb-12">
              <MariLogo variant="tagline-light" size={120} />
            </Link>

            <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-volt mb-3">
              Equity Planner
            </p>
            <h2 className="text-2xl xl:text-3xl font-bold leading-[1.15] tracking-[-0.02em] text-bone mb-10 break-words">
              Diagnóstico em 6 passos. Resultado em 30 segundos.
            </h2>

            <WizardProgress steps={steps} current={step} />
          </div>

          <div className="space-y-4 pt-8">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <ShieldCheck className="h-4 w-4 text-volt/80" />
              <span>Dados criptografados · LGPD · NDA implícito</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/35">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Análise gerada pela Mari · IA proprietária</span>
            </div>
          </div>
        </aside>

        {/* ===== MOBILE HEADER ===== */}
        <header className="lg:hidden sticky top-0 z-20 bg-carbon/95 backdrop-blur-md border-b border-white/5 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Link to="/">
              <MariLogo variant="tagline-light" size={84} />
            </Link>
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-volt">
              Passo {step + 1}/{steps.length}
            </span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-volt rounded-full"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
          <p className="text-[11px] text-white/50 mt-2 break-words">
            {steps[step]?.label}
          </p>
        </header>

        {/* ===== RIGHT (content) ===== */}
        <main className="relative flex flex-col bg-graphite/20 backdrop-blur-xl">
          <div className="flex-1 px-5 py-8 sm:px-10 lg:px-14 xl:px-20 lg:py-14">
            <div className="max-w-2xl mx-auto w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stepKey}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {footer && (
            <div className="sticky bottom-0 border-t border-white/5 bg-carbon/80 backdrop-blur-md px-5 py-4 sm:px-10 lg:px-14 xl:px-20">
              <div className="max-w-2xl mx-auto w-full">{footer}</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
