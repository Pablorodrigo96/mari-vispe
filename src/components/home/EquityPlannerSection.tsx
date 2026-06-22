import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Target, Gauge } from 'lucide-react';

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function EquityPlannerSection() {
  return (
    <section className="py-24 md:py-32 bg-carbon text-bone relative overflow-hidden">
      {/* Background fx */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,_hsla(72,86%,68%,0.12)_0%,_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,_hsla(72,86%,68%,0.06)_0%,_transparent_55%)]" />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(217,245,100,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(217,245,100,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center max-w-7xl mx-auto">
          {/* LEFT — manifesto */}
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
          >
            <p className="text-[11px] font-semibold tracking-[0.4em] uppercase text-volt mb-6">
              Equity Planner · Mari
            </p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.02] tracking-[-0.025em] break-words">
              Qualquer negócio pode ter <span className="text-volt">equity</span> — e ser vendido.
            </h2>
            <div className="w-16 h-1 bg-volt rounded-full mt-8" />
            <p className="text-lg sm:text-xl lg:text-2xl text-white/80 leading-[1.4] font-light mt-8 break-words max-w-2xl">
              A gente te entrega o <span className="text-bone font-medium">mapa prático</span> pra
              transformar a sua empresa numa empresa <span className="text-volt font-medium">vendável</span>.
            </p>

            <p className="text-sm text-white/50 mt-6 break-words">
              15 minutos · 12 pilares de prontidão · benchmark do seu setor · plano de 12 meses
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-volt hover:bg-volt-light text-carbon shadow-volt h-14 px-8 text-base font-bold rounded-xl"
              >
                <Link to="/equity-planner">
                  Fazer meu diagnóstico <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="bg-transparent border-white/20 text-bone hover:bg-white/5 hover:text-bone h-14 px-6 rounded-xl"
              >
                <Link to="/meus-equity-planners">Meus diagnósticos</Link>
              </Button>
            </div>
          </motion.div>

          {/* RIGHT — mockup cinematic */}
          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease, delay: 0.2 }}
          >
            <div className="relative">
              {/* Glow */}
              <div className="absolute -inset-4 bg-volt/10 rounded-3xl blur-2xl" />

              <div className="relative rounded-2xl border border-white/10 bg-graphite/60 backdrop-blur-xl p-6 lg:p-7 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/40">
                    Equity Snapshot
                  </p>
                  <span className="text-[10px] font-semibold text-volt bg-volt/10 border border-volt/20 px-2 py-0.5 rounded-full">
                    AO VIVO
                  </span>
                </div>

                {/* KPI 1 — IPE */}
                <div className="border-b border-white/5 pb-5 mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="h-3.5 w-3.5 text-volt" />
                    <p className="text-xs text-white/50">Índice de Prontidão (IPE)</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-bone tabular-nums">62</span>
                    <span className="text-sm text-white/40">/ 100</span>
                  </div>
                  <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-volt rounded-full" style={{ width: '62%' }} />
                  </div>
                </div>

                {/* KPI 2 — Valuation hoje */}
                <div className="border-b border-white/5 pb-5 mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-3.5 w-3.5 text-volt" />
                    <p className="text-xs text-white/50">Valuation hoje</p>
                  </div>
                  <p className="text-2xl font-bold text-bone tabular-nums">R$ 4,2 mi</p>
                </div>

                {/* KPI 3 — Gap */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-volt" />
                    <p className="text-xs text-white/50">Gap pro topo do setor</p>
                  </div>
                  <p className="text-2xl font-bold text-volt tabular-nums">+ R$ 3,1 mi</p>
                  <p className="text-[11px] text-white/40 mt-1 break-words">
                    destraváveis em 12 meses com o plano da Mari
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
