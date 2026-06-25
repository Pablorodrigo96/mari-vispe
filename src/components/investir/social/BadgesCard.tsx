import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award, Flame, Trophy, Sparkles, Star, Lock } from "lucide-react";

type Badge = {
  code: string;
  label: string;
  description: string;
  icon: any;
  earned: boolean;
  earnedAt?: string;
};

const ALL_BADGES: Omit<Badge, "earned" | "earnedAt">[] = [
  { code: "quiz_first_correct", label: "Primeiro acerto", description: "Acertou seu primeiro quiz Mari", icon: Sparkles },
  { code: "streak_7", label: "Sequência de 7", description: "7 dias seguidos ativos na Mari", icon: Flame },
  { code: "level_prata", label: "Nível Prata", description: "Atingiu 100 XP", icon: Star },
  { code: "level_ouro", label: "Nível Ouro", description: "Atingiu 250 XP", icon: Trophy },
  { code: "first_follow", label: "Primeira empresa", description: "Seguiu sua primeira empresa", icon: Award },
];

export function BadgesCard() {
  const [badges, setBadges] = useState<Badge[]>(
    ALL_BADGES.map((b) => ({ ...b, earned: false }))
  );

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("mari_badges")
        .select("badge_code, earned_at")
        .eq("user_id", u.user.id);
      const earned = new Map((data || []).map((d) => [d.badge_code, d.earned_at]));
      setBadges(
        ALL_BADGES.map((b) => ({
          ...b,
          earned: earned.has(b.code),
          earnedAt: earned.get(b.code) || undefined,
        }))
      );
    })();
  }, []);

  const count = badges.filter((b) => b.earned).length;

  return (
    <div className="bg-graphite/30 border border-bone/10 rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-volt mb-1">Seus selos</div>
          <div className="text-bone font-semibold text-lg">
            {count} <span className="text-bone/50 font-normal text-sm">de {badges.length}</span>
          </div>
        </div>
        <Award className="w-5 h-5 text-volt" />
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {badges.map((b) => {
          const Icon = b.icon;
          return (
            <li
              key={b.code}
              className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-all ${
                b.earned
                  ? "bg-volt/10 border-volt/30"
                  : "bg-carbon/40 border-bone/10 opacity-60"
              }`}
              title={b.description}
            >
              <div
                className={`w-10 h-10 rounded-full grid place-items-center ${
                  b.earned ? "bg-volt/20" : "bg-bone/5"
                }`}
              >
                {b.earned ? (
                  <Icon className="w-5 h-5 text-volt" />
                ) : (
                  <Lock className="w-4 h-4 text-bone/40" />
                )}
              </div>
              <div className="text-bone text-[11px] font-medium leading-tight">{b.label}</div>
              <div className="text-bone/45 text-[10px] leading-tight">{b.description}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
