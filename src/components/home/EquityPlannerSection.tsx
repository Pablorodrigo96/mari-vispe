import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Target, BarChart3, Map, ArrowRight } from 'lucide-react';

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function EquityPlannerSection() {
  return (
    <section className="py-20 bg-carbon text-bone relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_hsla(72,86%,68%,0.08)_0%,_transparent_55%)]" />
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
          <motion.div
            className="lg:col-span-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
          >
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-volt mb-4">
              Equity Planner · novo
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.05] tracking-[-0.02em] break-words">
              Quanto sua empresa vale hoje <span className="text-volt">vs.</span> quanto poderia valer.
            </h2>
            <div className="w-12 h-1 bg-volt rounded-full mt-5" />
            <p className="text-white/70 leading-relaxed mt-6 break-words">
              Em 15 minutos, a Mari diagnostica os 12 pilares que destravam valor na sua empresa,
              compara com o topo do seu setor e devolve um plano de 12 meses pra fechar o gap.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-volt hover:bg-volt-light text-carbon shadow-volt h-12 px-6 text-sm sm:text-base font-bold rounded-xl"
              >
                <Link to="/equity-planner">
                  Fazer diagnóstico <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="bg-transparent border-white/20 text-bone hover:bg-white/5 h-12 px-6 rounded-xl"
              >
                <Link to="/meus-equity-planners">Meus diagnósticos</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.15 }}
          >
            {[
              { icon: Target, label: '12 pilares', text: 'Governança, comercial, produto, time, financeiro, dados, marca…' },
              { icon: BarChart3, label: 'Benchmark', text: 'Compare com P25, P50 e top 10% do seu setor e porte.' },
              { icon: Map, label: 'Plano 12m', text: 'Iniciativas priorizadas por ROI sobre o valuation.' },
            ].map((item, i) => (
              <div
                key={i}
                className="glass-card rounded-xl p-5 border border-white/10 hover:border-volt/30 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-volt/15 border border-volt/20 flex items-center justify-center text-volt mb-3">
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-volt/80 mb-1.5">
                  {item.label}
                </p>
                <p className="text-sm text-white/70 leading-relaxed break-words">{item.text}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
