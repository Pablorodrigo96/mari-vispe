import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Activity,
  Target,
  TrendingUp,
  Users,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const PASSOS = [
  {
    icon: Activity,
    title: "Raio-X de Equity",
    desc: "12 dimensões de prontidão pontuadas pra gerar seu Índice de Prontidão (IPE).",
  },
  {
    icon: Target,
    title: "Valuation + Value Bridge",
    desc: "Valor hoje × valor potencial, parcela a parcela, ligado às iniciativas que pagam cada degrau.",
  },
  {
    icon: TrendingUp,
    title: "Plano em Equity Sprints",
    desc: "Roadmap trimestral priorizado: o que faz a empresa subir de múltiplo, em ordem.",
  },
  {
    icon: Users,
    title: "Mapa de Compradores",
    desc: "Quem paga mais por este ativo, por qual tese, e qual prêmio é negociável.",
  },
  {
    icon: RefreshCw,
    title: "Loop de Re-medição",
    desc: "Re-mede IPE e valor a cada execução. O dono vê o equity crescer ao vivo.",
  },
];

export default function EquityPlanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("equity_assessments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setCount(count || 0));
  }, [user]);

  return (
    <div className="min-h-screen bg-carbon text-bone">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,_hsla(72,86%,68%,0.14)_0%,_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_90%,_hsla(72,86%,68%,0.07)_0%,_transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(217,245,100,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(217,245,100,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="text-center max-w-4xl mx-auto"
          >
            <p className="text-[11px] font-semibold tracking-[0.4em] uppercase text-volt mb-6">
              Equity Planner · Mari
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.02] tracking-[-0.025em] break-words">
              Transforme sua empresa num{" "}
              <span className="text-volt">ativo vendável</span>.
            </h1>
            <div className="w-16 h-1 bg-volt rounded-full mt-8 mx-auto" />
            <p className="text-lg md:text-xl lg:text-2xl text-white/75 leading-[1.45] font-light mt-8 break-words max-w-3xl mx-auto">
              Valor = lucro normalizado × múltiplo. A Mari mostra como subir os
              dois — e em qual ordem.
            </p>

            <div className="mt-10 flex flex-wrap gap-3 justify-center">
              <Button
                size="lg"
                className="bg-volt hover:bg-volt-light text-carbon shadow-volt h-14 px-8 text-base font-bold rounded-xl"
                onClick={() => navigate("/equity-planner/novo")}
              >
                Começar diagnóstico <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {count > 0 && (
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-white/20 text-bone hover:bg-white/5 hover:text-bone h-14 px-6 rounded-xl"
                  onClick={() => navigate("/meus-equity-planners")}
                >
                  Ver meus planos ({count})
                </Button>
              )}
            </div>

            {/* Mini stat bar */}
            <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-white/50">
              <span>12 pilares</span>
              <span className="text-white/20">·</span>
              <span>IPE 0–100</span>
              <span className="text-white/20">·</span>
              <span>Benchmark P25 / P50 / Top 10%</span>
              <span className="text-white/20">·</span>
              <span>Plano de 12 meses</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ COMO FUNCIONA ============ */}
      <section className="py-20 md:py-24 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="mb-12"
          >
            <p className="text-[11px] font-semibold tracking-[0.4em] uppercase text-volt mb-3">
              Como funciona
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.02em] break-words max-w-2xl">
              5 passos do diagnóstico ao plano executável.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PASSOS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease, delay: i * 0.06 }}
                className="rounded-xl border border-white/10 bg-graphite/40 backdrop-blur-md p-5 hover:border-volt/40 hover:bg-graphite/60 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-volt/10 border border-volt/20 flex items-center justify-center text-volt">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono text-white/30">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-bone mb-2 break-words">
                  {p.title}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed break-words">
                  {p.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ EQUAÇÃO DE VALOR ============ */}
      <section className="py-20 md:py-24 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease }}
            >
              <p className="text-[11px] font-semibold tracking-[0.4em] uppercase text-volt mb-4">
                A equação de valor
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.02em] break-words leading-[1.1]">
                <span className="text-bone">VALOR</span>
                <span className="text-white/40 mx-2">=</span>
                <span className="text-volt">LUCRO</span>
                <span className="text-white/40 mx-2">×</span>
                <span className="text-volt">MÚLTIPLO</span>
              </h2>
              <p className="text-white/65 leading-relaxed mt-6 break-words">
                O múltiplo é determinado pelo seu <span className="text-bone font-medium">IPE</span> dentro
                da faixa do seu arquétipo de negócio. Subir o IPE → subir o
                múltiplo → subir o valor. Ciclo fechado, e o Equity Planner
                mostra o caminho — degrau por degrau.
              </p>
              <Button
                className="mt-8 bg-volt hover:bg-volt-light text-carbon shadow-volt h-12 px-6 rounded-xl font-bold"
                onClick={() => navigate("/equity-planner/novo")}
              >
                Quero ver o meu número <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease, delay: 0.15 }}
              className="rounded-2xl border border-white/10 bg-graphite/40 backdrop-blur-md p-6 lg:p-8"
            >
              <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/40 mb-6">
                Value Bridge ilustrativo
              </p>

              {/* Bars */}
              <div className="space-y-5">
                {[
                  { label: "Hoje", value: "R$ 4,2 mi", pct: 42, color: "bg-white/30" },
                  { label: "Após 2 sprints", value: "R$ 5,8 mi", pct: 58, color: "bg-volt/60" },
                  { label: "Topo do setor (12m)", value: "R$ 7,3 mi", pct: 100, color: "bg-volt" },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm text-white/60">{bar.label}</span>
                      <span className="text-sm font-semibold text-bone tabular-nums">
                        {bar.value}
                      </span>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${bar.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease, delay: 0.2 }}
                        className={`h-full ${bar.color} rounded-full`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-white/40 mt-6 break-words">
                Números ilustrativos. Seu Value Bridge real é gerado a partir do
                seu diagnóstico.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="py-20 md:py-24">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="relative overflow-hidden rounded-3xl bg-volt text-carbon p-10 md:p-16 text-center"
          >
            <div className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,0,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.6) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <h2 className="relative text-3xl md:text-5xl font-bold tracking-[-0.02em] leading-[1.05] break-words">
              Pronto pra ver o seu número?
            </h2>
            <p className="relative text-base md:text-lg text-carbon/80 mt-4 max-w-xl mx-auto break-words">
              15 minutos. Sem compromisso. Você sai daqui com IPE, valuation e
              plano de 12 meses na mão.
            </p>
            <Button
              size="lg"
              className="relative mt-8 bg-carbon hover:bg-carbon/90 text-volt h-14 px-8 text-base font-bold rounded-xl"
              onClick={() => navigate("/equity-planner/novo")}
            >
              Começar diagnóstico grátis <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
