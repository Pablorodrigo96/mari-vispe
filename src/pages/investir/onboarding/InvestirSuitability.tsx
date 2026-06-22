import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Compass } from "lucide-react";

const QUESTIONS = [
  { q: "Qual seu objetivo com investimentos em empresas privadas?",
    opts: [["preserve", "Preservar capital", 1], ["balanced", "Equilíbrio risco/retorno", 2], ["growth", "Crescimento agressivo", 3]] },
  { q: "Qual seu horizonte para esse investimento?",
    opts: [["short", "Até 2 anos", 1], ["mid", "2 a 5 anos", 2], ["long", "Mais de 5 anos", 3]] },
  { q: "Qual sua experiência com private equity / venture capital?",
    opts: [["none", "Nenhuma", 1], ["some", "Alguma exposição", 2], ["expert", "Investidor frequente", 3]] },
  { q: "Quanto do seu patrimônio você pode alocar em ativos de baixa liquidez?",
    opts: [["<5", "Até 5%", 1], ["5-20", "Entre 5% e 20%", 2], [">20", "Mais de 20%", 3]] },
  { q: "Como você reage a uma perda de 50% no curto prazo?",
    opts: [["sell", "Saio imediatamente", 1], ["wait", "Aguardo recuperação", 2], ["buy", "Aproveito para investir mais", 3]] },
] as const;

function profileFor(score: number) {
  if (score <= 7) return "conservador";
  if (score <= 11) return "moderado";
  return "agressivo";
}

export default function InvestirSuitability() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, [string, number]>>({});
  const [saving, setSaving] = useState(false);

  const score = Object.values(answers).reduce((s, [, v]) => s + v, 0);
  const profile = profileFor(score);
  const complete = Object.keys(answers).length === QUESTIONS.length;

  async function submit() {
    setSaving(true);
    try {
      const { data: ures } = await supabase.auth.getUser();
      if (!ures.user) { navigate("/investir/auth"); return; }
      const { error } = await supabase.from("investor_suitability").insert({
        user_id: ures.user.id,
        profile,
        score,
        answers: Object.fromEntries(Object.entries(answers).map(([k,[a]]) => [k, a])) as any,
        valid_until: new Date(Date.now() + 365*24*3600*1000).toISOString(),
      });
      if (error) throw error;
      await supabase.from("investor_terms_acceptances").insert([
        { user_id: ures.user.id, term_type: "risk", version: "1.0" },
        { user_id: ures.user.id, term_type: "adhesion", version: "1.0" },
      ]);
      toast.success("Perfil definido: " + profile);
      navigate("/investir/painel");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  return (
    <InvestirShell authed>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-volt/15 grid place-items-center">
            <Compass className="w-5 h-5 text-volt" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-volt/80">Passo 2 de 2</div>
            <h1 className="text-2xl font-semibold text-bone">Perfil do investidor</h1>
          </div>
        </div>

        <div className="space-y-4">
          {QUESTIONS.map((qq, i) => (
            <div key={i} className="bg-graphite/40 border border-bone/10 rounded-xl p-5">
              <div className="text-bone font-medium mb-3">{i+1}. {qq.q}</div>
              <div className="space-y-2">
                {qq.opts.map(([key, label, value]) => {
                  const selected = answers[i]?.[0] === key;
                  return (
                    <button
                      key={key}
                      onClick={()=>setAnswers({...answers, [i]: [key as string, value as number]})}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        selected ? "border-volt bg-volt/10 text-bone" : "border-bone/10 hover:border-bone/30 text-bone/70"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {complete && (
          <div className="mt-6 bg-volt/10 border border-volt/30 rounded-xl p-5 text-center">
            <div className="text-xs uppercase tracking-wider text-volt mb-1">Seu perfil</div>
            <div className="text-2xl font-semibold text-bone capitalize">{profile}</div>
            <div className="text-xs text-bone/60 mt-1">Score: {score} / 15</div>
          </div>
        )}

        <Button onClick={submit} disabled={!complete || saving} className="w-full mt-6 bg-volt hover:bg-volt/90 text-carbon font-semibold py-6">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar perfil"}
        </Button>
      </div>
    </InvestirShell>
  );
}
