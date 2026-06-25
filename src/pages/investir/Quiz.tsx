import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, CheckCircle2, XCircle, Flame, Trophy, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Quiz = {
  id: string;
  question: string;
  options: string[];
  quiz_date: string;
};

type AnswerResult = {
  correct?: boolean;
  already?: boolean;
  correct_index: number;
  explanation?: string;
  xp_gain?: number;
  new_xp?: number;
  new_level?: string;
  streak?: number;
};

export default function Quiz() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setAuthed(!!u.user);
      const today = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
      ).toISOString().slice(0, 10);

      const { data } = await supabase
        .from("mari_daily_quiz")
        .select("id,question,options,quiz_date")
        .lte("quiz_date", today)
        .order("quiz_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setQuiz({
          id: data.id,
          question: data.question,
          options: (data.options as any) || [],
          quiz_date: data.quiz_date,
        });

        if (u.user) {
          const { data: prev } = await supabase
            .from("mari_quiz_answers")
            .select("choice_index,is_correct")
            .eq("user_id", u.user.id)
            .eq("quiz_id", data.id)
            .maybeSingle();
          if (prev) {
            setPicked(prev.choice_index);
            // Fetch correct_index + explanation pulling whole row (RLS allows public read)
            const { data: full } = await supabase
              .from("mari_daily_quiz")
              .select("correct_index,explanation")
              .eq("id", data.id)
              .maybeSingle();
            setResult({
              already: true,
              correct: prev.is_correct,
              correct_index: full?.correct_index ?? 0,
              explanation: full?.explanation || undefined,
            });
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  async function answer(idx: number) {
    if (!authed) {
      window.location.href = `/investir/auth?next=${encodeURIComponent("/investir/quiz")}`;
      return;
    }
    if (!quiz || submitting || result) return;
    setPicked(idx);
    setSubmitting(true);
    const { data, error } = await supabase.rpc("answer_daily_quiz", {
      p_quiz_id: quiz.id,
      p_choice: idx,
    });
    setSubmitting(false);
    if (error) {
      console.error(error);
      return;
    }
    setResult(data as unknown as AnswerResult);
  }

  return (
    <InvestirShell authed={authed} hideFooter>
      <div className="max-w-[720px] mx-auto px-5 md:px-6 py-8 md:py-12">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-volt" />
          <span className="text-[10px] uppercase tracking-wider text-volt font-semibold">
            Quiz Mari · {new Date().toLocaleDateString("pt-BR")}
          </span>
        </div>
        <h1 className="text-bone text-2xl md:text-3xl font-semibold mb-1 break-words">
          Aprenda 1 coisa nova por dia.
        </h1>
        <p className="text-bone/55 text-sm mb-6">
          +25 XP por acerto · +5 XP por participação · mantém sua sequência viva.
        </p>

        {loading ? (
          <Skeleton className="h-72 w-full bg-graphite/40 rounded-2xl" />
        ) : !quiz ? (
          <div className="bg-graphite/30 border border-bone/10 rounded-2xl p-8 text-center text-bone/65">
            Sem pergunta hoje. Volte amanhã.
          </div>
        ) : (
          <div className="bg-graphite/30 border border-bone/10 rounded-2xl p-5 md:p-7">
            <h2 className="text-bone text-lg md:text-xl font-semibold mb-5 break-words">
              {quiz.question}
            </h2>
            <ul className="space-y-2.5">
              {quiz.options.map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = result && result.correct_index === i;
                const isWrongPick = result && isPicked && !isCorrect;
                return (
                  <li key={i}>
                    <button
                      disabled={!!result || submitting}
                      onClick={() => answer(i)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3
                        ${
                          isCorrect
                            ? "bg-volt/15 border-volt/50 text-bone"
                            : isWrongPick
                            ? "bg-red-500/10 border-red-500/40 text-bone"
                            : "bg-carbon/40 border-bone/10 text-bone hover:border-volt/40 disabled:opacity-60"
                        }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full grid place-items-center text-xs font-semibold shrink-0 ${
                          isCorrect
                            ? "bg-volt text-carbon"
                            : isWrongPick
                            ? "bg-red-500/30 text-bone"
                            : "bg-bone/10 text-bone/70"
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1 text-sm break-words">{opt}</span>
                      {isCorrect && <CheckCircle2 className="w-5 h-5 text-volt shrink-0" />}
                      {isWrongPick && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            {result && (
              <div className="mt-5 bg-carbon/50 border border-volt/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  {result.correct ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-volt" />
                      <span className="text-volt text-sm font-semibold">
                        {result.already ? "Você já respondeu hoje" : "Mandou bem!"}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-sm font-semibold">
                        {result.already ? "Você já respondeu hoje" : "Quase!"}
                      </span>
                    </>
                  )}
                </div>
                {result.explanation && (
                  <p className="text-bone/75 text-sm leading-relaxed mb-3">{result.explanation}</p>
                )}
                {!result.already && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-bone/60">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-volt" />
                      <strong className="text-volt">+{result.xp_gain} XP</strong> ({result.new_xp} total)
                    </span>
                    {result.streak ? (
                      <span className="inline-flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-volt" /> Sequência {result.streak} dias
                      </span>
                    ) : null}
                    {result.new_level ? (
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-volt" /> Nível {result.new_level}
                      </span>
                    ) : null}
                  </div>
                )}
                <Link
                  to="/investir/missoes"
                  className="mt-4 inline-flex items-center gap-1 text-volt text-sm hover:underline"
                >
                  Ver missões e selos <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </InvestirShell>
  );
}
