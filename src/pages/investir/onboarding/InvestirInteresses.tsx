import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { HUMAN_CATEGORIES } from "@/types/social";
import { supabase } from "@/integrations/supabase/client";
import { seedCompanies } from "@/data/socialSeed";
import { Loader2, ArrowRight, ArrowLeft, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

const STEPS = ["setores", "perfil", "cidade", "empresas"] as const;
type Step = typeof STEPS[number];

export default function InvestirInteresses() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("setores");
  const [setores, setSetores] = useState<string[]>([]);
  const [perfil, setPerfil] = useState<"empresario" | "profissional" | "curioso" | "">("");
  const [setorAtuacao, setSetorAtuacao] = useState("");
  const [cidade, setCidade] = useState("");
  const [empresasFav, setEmpresasFav] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/investir/auth?mode=signup");
      else setAuthed(true);
    });
  }, [navigate]);

  function toggle(arr: string[], v: string, setter: (a: string[]) => void) {
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  const idx = STEPS.indexOf(step);
  const canNext =
    (step === "setores" && setores.length >= 1) ||
    (step === "perfil" && !!perfil) ||
    (step === "cidade" && cidade.trim().length >= 2) ||
    step === "empresas";

  async function finish() {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("profiles").update({
        interests: {
          setores,
          perfil,
          setor_atuacao: setorAtuacao || null,
          cidade,
          empresas_favoritas: empresasFav,
          completed_at: new Date().toISOString(),
        } as any,
      }).eq("user_id", u.user.id);
      toast.success("Pronto! Seu feed Mari está personalizado.");
      navigate("/investir/onboarding/kyc");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  if (!authed) return null;

  return (
    <InvestirShell hideFooter>
      <div className="max-w-[640px] mx-auto px-5 md:px-6 py-8 md:py-14">
        {/* Header com progresso */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-volt mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Passo {idx + 1} de {STEPS.length}
          </div>
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1 h-1 bg-bone/10 rounded-full overflow-hidden">
                <div className={`h-full bg-volt transition-all ${i <= idx ? "w-full" : "w-0"}`} />
              </div>
            ))}
          </div>
        </div>

        {step === "setores" && (
          <div>
            <h1 className="text-bone text-2xl md:text-3xl font-semibold leading-tight">
              Quais <span className="text-volt">negócios</span> você gosta de acompanhar?
            </h1>
            <p className="text-bone/55 text-sm mt-2">Escolha pelo menos 1. Vamos usar para personalizar seu feed.</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {HUMAN_CATEGORIES.map((c) => {
                const on = setores.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(setores, c.id, setSetores)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                      on
                        ? "bg-volt text-carbon ring-2 ring-volt"
                        : "bg-graphite/40 text-bone/80 border border-bone/10 hover:border-volt/40"
                    }`}
                  >
                    <span className="text-base">{c.emoji}</span>
                    {c.label}
                    {on && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "perfil" && (
          <div>
            <h1 className="text-bone text-2xl md:text-3xl font-semibold leading-tight">
              Como você se descreve?
            </h1>
            <p className="text-bone/55 text-sm mt-2">Sem julgamento — só ajuda a Mari conversar do seu jeito.</p>

            <div className="mt-6 grid gap-3">
              {[
                { id: "empresario", label: "Sou empresário(a)", body: "Tenho ou já tive meu próprio negócio." },
                { id: "profissional", label: "Trabalho num setor que me interessa", body: "Atuo em alguma área da economia real." },
                { id: "curioso", label: "Curioso(a) que adora empresas", body: "Acompanho histórias de fundadores e marcas." },
              ].map((o) => (
                <button
                  key={o.id}
                  onClick={() => setPerfil(o.id as any)}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    perfil === o.id
                      ? "border-volt bg-volt/10"
                      : "border-bone/10 bg-graphite/30 hover:border-volt/40"
                  }`}
                >
                  <div className="text-bone font-medium text-sm">{o.label}</div>
                  <div className="text-bone/55 text-xs mt-0.5">{o.body}</div>
                </button>
              ))}
            </div>

            {(perfil === "empresario" || perfil === "profissional") && (
              <input
                placeholder="Em qual setor? (opcional)"
                value={setorAtuacao}
                onChange={(e) => setSetorAtuacao(e.target.value)}
                className="mt-4 w-full bg-graphite/40 border border-bone/10 rounded-xl px-4 py-3 text-sm text-bone placeholder:text-bone/35 focus:outline-none focus:border-volt/50"
              />
            )}
          </div>
        )}

        {step === "cidade" && (
          <div>
            <h1 className="text-bone text-2xl md:text-3xl font-semibold leading-tight">
              De qual <span className="text-volt">cidade</span> você é?
            </h1>
            <p className="text-bone/55 text-sm mt-2">Vamos sugerir empresas perto de você.</p>

            <input
              placeholder="Ex.: Curitiba/PR"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              autoFocus
              className="mt-6 w-full bg-graphite/40 border border-bone/10 rounded-xl px-5 py-4 text-lg text-bone placeholder:text-bone/35 focus:outline-none focus:border-volt/50"
            />
          </div>
        )}

        {step === "empresas" && (
          <div>
            <h1 className="text-bone text-2xl md:text-3xl font-semibold leading-tight">
              Alguma já te chama atenção?
            </h1>
            <p className="text-bone/55 text-sm mt-2">Toque nas que parecem interessantes — você pode pular.</p>

            <ul className="mt-6 grid sm:grid-cols-2 gap-3">
              {seedCompanies.map((c) => {
                const on = empresasFav.includes(c.symbol);
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => toggle(empresasFav, c.symbol, setEmpresasFav)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        on
                          ? "border-volt bg-volt/10"
                          : "border-bone/10 bg-graphite/30 hover:border-volt/40"
                      }`}
                    >
                      <img src={c.avatar} alt="" className="w-11 h-11 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-bone font-medium text-sm truncate">{c.name}</div>
                        <div className="text-bone/45 text-[11px] truncate">{c.sector} · {c.city}</div>
                      </div>
                      {on && <Check className="w-4 h-4 text-volt" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-10 flex items-center justify-between gap-3">
          <button
            onClick={() => idx > 0 ? setStep(STEPS[idx - 1]) : navigate(-1)}
            className="inline-flex items-center gap-1.5 text-bone/55 hover:text-bone text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> {idx === 0 ? "Voltar" : "Anterior"}
          </button>

          {step !== "empresas" ? (
            <button
              onClick={() => canNext && setStep(STEPS[idx + 1])}
              disabled={!canNext}
              className="inline-flex items-center gap-2 bg-volt text-carbon font-semibold px-6 py-3 rounded-full text-sm disabled:bg-bone/10 disabled:text-bone/40"
            >
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-volt text-carbon font-semibold px-6 py-3 rounded-full text-sm disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Finalizar <ArrowRight className="w-4 h-4" /></>}
            </button>
          )}
        </div>

        {step === "empresas" && (
          <button onClick={finish} className="block mx-auto mt-4 text-bone/45 text-xs hover:text-volt">
            Pular esta etapa
          </button>
        )}
      </div>
    </InvestirShell>
  );
}
