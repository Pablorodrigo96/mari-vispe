import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock, ShieldCheck, Check, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function SignupGateCard() {
  const navigate = useNavigate();
  const next = encodeURIComponent("/equity-planner/novo?resume=1");
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="rounded-2xl border border-volt/30 bg-gradient-to-br from-graphite/60 to-carbon/80 backdrop-blur-xl p-7 md:p-9 relative overflow-hidden"
    >
      <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-volt/10 blur-3xl pointer-events-none" />

      <div className="flex items-center gap-2 text-volt mb-4">
        <Check className="h-5 w-5" />
        <span className="text-xs font-semibold tracking-[0.3em] uppercase">
          Diagnóstico completo
        </span>
      </div>

      <h3 className="text-2xl md:text-3xl font-bold tracking-[-0.02em] leading-[1.15] break-words">
        Falta <span className="text-volt">1 passo</span> pra desbloquear o seu plano.
      </h3>

      <p className="text-white/65 mt-4 leading-relaxed break-words">
        Pra garantir a segurança dos seus dados e do seu planejamento, crie uma
        conta gratuita. Suas respostas ficam salvas — após o cadastro, o
        diagnóstico é gerado automaticamente.
      </p>

      <ul className="mt-6 space-y-2.5 text-sm">
        {[
          "Raio-X completo nas 12 dimensões",
          "Valuation com Value Bridge e múltiplo do setor",
          "Plano em sprints + mapa de compradores",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-white/70 break-words">
            <Check className="h-4 w-4 text-volt shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-7 flex flex-col sm:flex-row gap-3">
        <Button
          size="lg"
          className="bg-volt hover:bg-volt-light text-carbon font-bold h-12 flex-1 rounded-xl shadow-volt"
          onClick={() => navigate(`/auth?tab=signup&redirect=${next}`)}
        >
          <Lock className="mr-2 h-4 w-4" />
          Criar conta grátis
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="bg-transparent border-white/15 text-bone hover:bg-white/5 hover:text-bone h-12 sm:flex-initial rounded-xl"
          onClick={() => navigate(`/auth?redirect=${next}`)}
        >
          Já tenho conta
        </Button>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-white/40 mt-5">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>LGPD · dados criptografados · sem spam, sem cartão</span>
      </div>
    </motion.div>
  );
}
