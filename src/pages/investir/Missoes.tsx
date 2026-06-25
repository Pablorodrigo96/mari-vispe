import { InvestirShell } from "@/components/investir/InvestirShell";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BadgesCard } from "@/components/investir/social/BadgesCard";
import { Flame, CheckCircle2, Sparkles, Users, MessageCircle, BookOpen, Award, GitCompareArrows, ArrowRight } from "lucide-react";

type Missao = { id: string; titulo: string; xp: number; done: boolean; icon: any; href?: string };

const defaults: Missao[] = [
  { id: "m5", titulo: "Responder o quiz do dia (+25 XP)", xp: 25, done: false, icon: Award, href: "/investir/quiz" },
  { id: "m1", titulo: "Assistir a um Resumo Mari", xp: 10, done: false, icon: Sparkles },
  { id: "m2", titulo: "Comentar em uma empresa", xp: 15, done: false, icon: MessageCircle },
  { id: "m3", titulo: "Seguir 3 empresas novas", xp: 20, done: false, icon: Users },
  { id: "m4", titulo: "Ler um Diário completo", xp: 15, done: false, icon: BookOpen },
  { id: "m6", titulo: "Comparar 2 empresas lado a lado", xp: 15, done: false, icon: GitCompareArrows, href: "/investir/comparar" },
];


export default function Missoes() {
  const [missoes, setMissoes] = useState<Missao[]>(defaults);
  const [xp, setXp] = useState(120);
  const [streak, setStreak] = useState(3);

  function done(id: string) {
    setMissoes((m) => m.map((x) => (x.id === id && !x.done ? { ...x, done: true } : x)));
    const m = missoes.find((x) => x.id === id);
    if (m && !m.done) setXp((v) => v + m.xp);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: x } = await supabase
        .from("mari_social_xp").select("xp,streak_days").eq("user_id", data.user.id).maybeSingle();
      if (x) { setXp(x.xp); setStreak(x.streak_days); }
    });
  }, []);

  const level = xp >= 500 ? "Platina" : xp >= 250 ? "Ouro" : xp >= 100 ? "Prata" : "Bronze";

  return (
    <InvestirShell hideFooter>
      <div className="max-w-[800px] mx-auto px-5 md:px-6 py-8 md:py-12">
        <div className="bg-gradient-to-br from-volt/15 to-transparent border border-volt/25 rounded-2xl p-5 md:p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-volt mb-1">Seu XP Mari</div>
              <div className="text-4xl font-semibold text-bone tabular-nums">{xp}</div>
              <div className="text-bone/55 text-xs mt-1">Nível <strong className="text-volt">{level}</strong></div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 text-volt"><Flame className="w-4 h-4" /> {streak} dias</div>
              <div className="text-bone/45 text-[11px]">Sequência ativa</div>
            </div>
          </div>
        </div>

        <h2 className="text-bone font-semibold text-lg md:text-xl mb-3">Missões de hoje</h2>
        <ul className="space-y-2">
          {missoes.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => done(m.id)}
                disabled={m.done}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  m.done
                    ? "bg-volt/10 border-volt/30 text-bone/55"
                    : "bg-graphite/30 border-bone/10 hover:border-volt/40 text-bone"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl grid place-items-center ${m.done ? "bg-volt/20" : "bg-bone/10"}`}>
                  {m.done ? <CheckCircle2 className="w-5 h-5 text-volt" /> : <m.icon className="w-5 h-5 text-volt" />}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-sm">{m.titulo}</div>
                  <div className="text-bone/45 text-[11px]">+{m.xp} XP</div>
                </div>
                {m.done && <span className="text-[10px] uppercase tracking-wider text-volt">Concluída</span>}
              </button>
            </li>
          ))}
        </ul>

        <p className="text-bone/35 text-[10px] mt-6 text-center">
          XP recompensa <strong>comportamento</strong>, nunca compra. O jogo é conhecer melhor as empresas.
        </p>
      </div>
    </InvestirShell>
  );
}
