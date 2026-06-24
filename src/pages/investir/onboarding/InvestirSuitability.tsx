import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";

const QUESTIONS = [
  {
    q: "O que você prioriza ao investir?",
    sub: "Existem investimentos mais seguros com retorno menor, e outros mais arriscados com ganhos maiores.",
    opts: [
      ["preserve", "Segurança em primeiro lugar — não quero perder dinheiro", 1],
      ["balanced", "Tolero pequenas oscilações, sem arriscar muito", 2],
      ["growth", "Aceito perdas em busca de ganhos maiores no longo prazo", 3],
      ["aggressive", "Busco a maior rentabilidade possível", 3],
    ],
  },
  {
    q: "Por quanto tempo pretende manter esse investimento?",
    sub: "Pense nos seus objetivos: viagem, imóvel, aposentadoria.",
    opts: [
      ["short", "Até 2 anos", 1],
      ["mid", "2 a 5 anos", 2],
      ["long", "Mais de 5 anos", 3],
    ],
  },
  {
    q: "Sua experiência com empresas privadas?",
    sub: "Inclui private equity, venture capital, crowdfunding.",
    opts: [
      ["none", "Nenhuma — seria meu primeiro", 1],
      ["some", "Já investi algumas vezes", 2],
      ["expert", "Sou investidor frequente", 3],
    ],
  },
  {
    q: "Quanto do patrimônio pode alocar em baixa liquidez?",
    sub: "Ativos de baixa liquidez não podem ser vendidos a qualquer momento.",
    opts: [
      ["<5", "Até 5%", 1],
      ["5-20", "Entre 5% e 20%", 2],
      [">20", "Mais de 20%", 3],
    ],
  },
  {
    q: "Como reagiria a uma perda de 50% no curto prazo?",
    sub: "Sua reação ajuda a entender seu perfil emocional.",
    opts: [
      ["sell", "Saio para evitar mais perdas", 1],
      ["wait", "Aguardo recuperação", 2],
      ["buy", "Aproveito o preço baixo pra investir mais", 3],
    ],
  },
] as const;

function profileFor(score: number) {
  if (score <= 7) return "conservador";
  if (score <= 11) return "moderado";
  return "agressivo";
}

export default function InvestirSuitability() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, [string, number]>>({});
  const [saving, setSaving] = useState(false);

  const total = QUESTIONS.length;
  const current = QUESTIONS[step];
  const currentAnswer = answers[step]?.[0];
  const score = Object.values(answers).reduce((s, [, v]) => s + v, 0);
  const profile = profileFor(score);
  const complete = Object.keys(answers).length === total;
  const isLast = step === total - 1;
  const progress = Math.round(((step + (currentAnswer ? 1 : 0)) / total) * 100);

  async function submit() {
    setSaving(true);
    try {
      const { data: ures } = await supabase.auth.getUser();
      if (!ures.user) {
        navigate("/investir/auth");
        return;
      }
      const { error } = await supabase.from("investor_suitability").insert({
        user_id: ures.user.id,
        profile,
        score,
        answers: Object.fromEntries(Object.entries(answers).map(([k, [a]]) => [k, a])) as any,
        valid_until: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      });
      if (error) throw error;
      await supabase.from("investor_terms_acceptances").insert([
        { user_id: ures.user.id, term_type: "risk", version: "1.0" },
        { user_id: ures.user.id, term_type: "adhesion", version: "1.0" },
      ]);
      toast.success("Pronto! Seu perfil é " + profile);
      navigate("/investir/painel");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <InvestirShell authed hideFooter>
      <div className="min-h-[calc(100vh-3.5rem)] bg-carbon pb-28">
        {/* Topbar com progresso */}
        <div className="sticky top-14 z-30 bg-carbon/95 backdrop-blur-xl border-b border-bone/10">
          <div className="max-w-2xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}
              className="text-bone/70 -ml-2 p-2"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-bone/45">Perfil de investidor</div>
              <div className="text-sm text-bone font-medium">
                Pergunta {step + 1} de {total}
              </div>
            </div>
            <div className="text-xs text-volt font-semibold tabular-nums">{progress}%</div>
          </div>
          <div className="h-1 bg-bone/10">
            <div className="h-full bg-volt transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 md:px-6 py-8 md:py-12">
          <h1 className="text-2xl md:text-4xl font-semibold text-bone tracking-tight leading-tight">
            {current.q}
          </h1>
          <p className="mt-3 text-bone/55 text-sm md:text-base leading-relaxed">{current.sub}</p>

          <div className="mt-8 space-y-2.5">
            {current.opts.map(([key, label, value]) => {
              const selected = currentAnswer === key;
              return (
                <button
                  key={key}
                  onClick={() => setAnswers({ ...answers, [step]: [key as string, value as number] })}
                  className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                    selected
                      ? "border-volt bg-volt text-carbon"
                      : "border-bone/15 bg-graphite/30 text-bone hover:border-volt/40"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 grid place-items-center shrink-0 ${
                      selected ? "border-carbon bg-carbon" : "border-bone/30"
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5 text-volt" strokeWidth={3} />}
                  </div>
                  <div className="font-medium leading-snug text-sm md:text-base">{label}</div>
                </button>
              );
            })}
          </div>

          {complete && isLast && (
            <div className="mt-8 bg-volt/10 border-2 border-volt rounded-2xl p-5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-volt mb-1.5">Seu perfil é</div>
              <div className="text-2xl font-semibold text-bone capitalize">{profile}</div>
              <div className="text-xs text-bone/55 mt-1">Score {score} / 15</div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-carbon/95 backdrop-blur-xl border-t border-bone/10 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-2xl mx-auto px-5 md:px-6 py-3">
            {!isLast ? (
              <button
                onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
                disabled={!currentAnswer}
                className="w-full inline-flex items-center justify-center gap-2 bg-volt hover:bg-volt/90 text-carbon disabled:bg-bone/10 disabled:text-bone/30 px-6 py-3.5 rounded-xl font-semibold transition-colors"
              >
                Próximo <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!complete || saving}
                className="w-full inline-flex items-center justify-center gap-2 bg-volt hover:bg-volt/90 text-carbon disabled:bg-bone/10 disabled:text-bone/30 px-6 py-3.5 rounded-xl font-semibold transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirmar perfil <ArrowRight className="w-4 h-4" /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </InvestirShell>
  );
}
