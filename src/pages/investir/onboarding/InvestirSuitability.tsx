import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";

const QUESTIONS = [
  {
    q: "O que você prioriza ao investir?",
    sub: "Existem investimentos mais seguros com retorno menor, e outros mais arriscados com ganhos potencialmente maiores.",
    opts: [
      ["preserve", "Busco primeiro segurança, não quero perder dinheiro", 1],
      ["balanced", "Tolero pequenas oscilações, mas nada que arrisque meu patrimônio", 2],
      ["growth", "Aceito algumas perdas em busca de ganhos maiores no longo prazo", 3],
      ["aggressive", "Busco a maior rentabilidade, assumindo altos riscos", 3],
    ],
  },
  {
    q: "Por quanto tempo você pretende manter esse investimento?",
    sub: "Pense em seus objetivos: uma viagem, um imóvel, aposentadoria.",
    opts: [
      ["short", "Até 2 anos", 1],
      ["mid", "2 a 5 anos", 2],
      ["long", "Mais de 5 anos", 3],
    ],
  },
  {
    q: "Qual sua experiência com investimentos em empresas privadas?",
    sub: "Inclui private equity, venture capital, crowdfunding e participações societárias.",
    opts: [
      ["none", "Nenhuma — esse seria meu primeiro", 1],
      ["some", "Já investi algumas vezes", 2],
      ["expert", "Sou investidor frequente nesse tipo de ativo", 3],
    ],
  },
  {
    q: "Quanto do seu patrimônio você pode alocar em ativos de baixa liquidez?",
    sub: "Ativos de baixa liquidez não podem ser vendidos a qualquer momento.",
    opts: [
      ["<5", "Até 5% do meu patrimônio", 1],
      ["5-20", "Entre 5% e 20%", 2],
      [">20", "Mais de 20%", 3],
    ],
  },
  {
    q: "Como você reagiria a uma perda de 50% no curto prazo?",
    sub: "Sua reação ajuda a entender seu perfil emocional como investidor.",
    opts: [
      ["sell", "Saio imediatamente para evitar mais perdas", 1],
      ["wait", "Aguardo uma possível recuperação", 2],
      ["buy", "Aproveito o preço mais baixo para investir mais", 3],
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

  async function submit() {
    setSaving(true);
    try {
      const { data: ures } = await supabase.auth.getUser();
      if (!ures.user) { navigate("/investir/auth"); return; }
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
    } finally { setSaving(false); }
  }

  const isLast = step === total - 1;
  const showResult = complete && isLast;

  return (
    <InvestirShell authed>
      <div className="min-h-[calc(100vh-3.5rem)] bg-carbon">
        {/* Stepper */}
        <div className="border-b border-bone/10 bg-carbon/95 sticky top-14 z-30">
          <div className="max-w-3xl mx-auto px-6 py-5">
            <div className="flex items-center justify-center gap-3">
              {QUESTIONS.map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full grid place-items-center text-xs font-semibold transition-colors ${
                      i < step ? "bg-volt text-carbon" :
                      i === step ? "bg-volt text-carbon ring-4 ring-volt/20" :
                      "bg-bone/10 text-bone/40"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < total - 1 && (
                    <div className={`w-12 h-px ${i < step ? "bg-volt" : "bg-bone/15"}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center text-xs text-bone/50 mt-3">
              Passo {step + 1} de {total} · Perfil do investidor
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
          <h1 className="text-3xl md:text-5xl font-semibold text-volt tracking-tight text-center leading-tight">
            {current.q}
          </h1>
          <p className="mt-5 text-bone/60 text-center max-w-2xl mx-auto leading-relaxed">
            {current.sub}
          </p>

          <div className="mt-12 grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {current.opts.map(([key, label, value]) => {
              const selected = currentAnswer === key;
              return (
                <button
                  key={key}
                  onClick={() => setAnswers({ ...answers, [step]: [key as string, value as number] })}
                  className={`text-left p-5 rounded-2xl border-2 transition-all ${
                    selected
                      ? "border-l-[6px] border-l-volt border-volt bg-volt text-carbon"
                      : "border-l-[6px] border-l-volt border-bone/10 bg-[#FAFAF7] text-carbon hover:border-volt/50"
                  }`}
                >
                  <div className="font-medium leading-snug">{label}</div>
                </button>
              );
            })}
          </div>

          {showResult && (
            <div className="mt-10 max-w-md mx-auto bg-volt/10 border-2 border-volt rounded-2xl p-6 text-center">
              <div className="text-xs uppercase tracking-wider text-volt mb-2">Seu perfil é</div>
              <div className="text-3xl font-semibold text-bone capitalize">{profile}</div>
              <div className="text-xs text-bone/60 mt-1">Score: {score} / 15</div>
            </div>
          )}

          <div className="mt-12 max-w-2xl mx-auto flex items-center justify-center gap-4">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-2 border-2 border-bone/20 text-bone hover:bg-bone/5 disabled:opacity-30 px-7 py-3.5 rounded-full font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            {!isLast ? (
              <button
                onClick={() => setStep(s => Math.min(total - 1, s + 1))}
                disabled={!currentAnswer}
                className="inline-flex items-center gap-2 bg-volt hover:bg-volt/90 text-carbon disabled:bg-bone/10 disabled:text-bone/30 px-9 py-3.5 rounded-full font-semibold transition-colors"
              >
                Próximo <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!complete || saving}
                className="inline-flex items-center gap-2 bg-volt hover:bg-volt/90 text-carbon disabled:bg-bone/10 disabled:text-bone/30 px-9 py-3.5 rounded-full font-semibold transition-colors"
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
