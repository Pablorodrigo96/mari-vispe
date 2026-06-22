import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Save, Brain, CheckCircle2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { brl } from "@/lib/equity-planner/constants";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initiative: any | null;
  onCompiled?: () => void;
}

interface Question { id: string; pergunta: string; contexto?: string; tipo?: string; }

export default function InitiativeDeepDiveModal({ open, onOpenChange, initiative, onCompiled }: Props) {
  const [loading, setLoading] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [diagnostico, setDiagnostico] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [compiledPrompt, setCompiledPrompt] = useState<string>("");
  const [status, setStatus] = useState<string>("pendente");
  const [deepdiveId, setDeepdiveId] = useState<string | null>(null);
  const [savingAnswers, setSavingAnswers] = useState(false);

  useEffect(() => {
    if (!open || !initiative) return;
    (async () => {
      setLoading(true);
      try {
        const { data: existing } = await supabase
          .from("equity_initiative_deepdive")
          .select("*")
          .eq("initiative_id", initiative.id)
          .maybeSingle();

        if (existing && Array.isArray((existing as any).questions) && (existing as any).questions.length > 0) {
          setDeepdiveId((existing as any).id);
          setQuestions((existing as any).questions);
          setAnswers((existing as any).answers || {});
          setCompiledPrompt((existing as any).compiled_prompt || "");
          setStatus((existing as any).status);
          setDiagnostico([]);
        } else {
          const { data, error } = await supabase.functions.invoke("equity-deepdive-questions", {
            body: { initiative_id: initiative.id },
          });
          if (error) throw error;
          setDiagnostico((data as any)?.diagnostico || []);
          setQuestions((data as any)?.perguntas || []);
          setAnswers({});
          setCompiledPrompt("");
          setStatus("em_andamento");
          const { data: dd2 } = await supabase
            .from("equity_initiative_deepdive")
            .select("id")
            .eq("initiative_id", initiative.id)
            .maybeSingle();
          setDeepdiveId((dd2 as any)?.id || null);
        }
      } catch (e: any) {
        toast.error("Falha ao carregar diagnóstico profundo: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, initiative]);

  const persistAnswers = async (next: Record<string, string>) => {
    if (!deepdiveId) return;
    setSavingAnswers(true);
    try {
      await supabase.from("equity_initiative_deepdive").update({ answers: next, status: "em_andamento" }).eq("id", deepdiveId);
    } finally {
      setSavingAnswers(false);
    }
  };

  const handleChange = (qid: string, value: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: value };
      // debounce
      window.clearTimeout((handleChange as any)._t);
      (handleChange as any)._t = window.setTimeout(() => persistAnswers(next), 800);
      return next;
    });
  };

  const handleCompile = async () => {
    if (!initiative) return;
    setCompiling(true);
    try {
      // garante que respostas estão salvas
      await persistAnswers(answers);
      const { data, error } = await supabase.functions.invoke("equity-deepdive-compile", {
        body: { initiative_id: initiative.id },
      });
      if (error) throw error;
      setCompiledPrompt((data as any)?.compiled_prompt || "");
      setStatus("concluida");
      toast.success("Prompt de aceleração gerado");
      onCompiled?.();
    } catch (e: any) {
      toast.error("Falha ao compilar: " + e.message);
    } finally {
      setCompiling(false);
    }
  };

  const answered = Object.values(answers).filter((v) => (v || "").trim().length > 3).length;
  const canCompile = answered >= Math.max(3, Math.ceil(questions.length * 0.5));

  if (!initiative) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl !bg-carbon border-volt/30 text-bone max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-3 text-bone">
            <Brain className="h-5 w-5 text-volt mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold break-words">{initiative.titulo}</div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="outline" className="border-volt/30 text-volt bg-volt/5">+{initiative.delta_ipe} IPE</Badge>
                <Badge variant="outline" className="border-volt/30 text-volt bg-volt/5">{brl(initiative.delta_valor)}</Badge>
                <Badge variant="outline" className="border-white/20 text-white/80 bg-transparent">{initiative.esforco}</Badge>
                <Badge variant="outline" className="border-white/20 text-white/80 bg-transparent">{initiative.prazo_meses}m</Badge>
                <Badge variant="outline" className="border-white/20 text-white/80 bg-transparent capitalize">{initiative.dimensao_alvo.replace(/_/g, " ")}</Badge>
                {status === "concluida" && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Concluído
                  </Badge>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-white/70">
            <Loader2 className="h-8 w-8 animate-spin text-volt" />
            <p className="text-sm">Gerando diagnóstico profundo com IA…</p>
          </div>
        ) : (
          <div className="space-y-5">
            {diagnostico.length > 0 && (
              <div className="rounded-xl border border-volt/20 bg-volt/5 p-4">
                <p className="text-[11px] uppercase tracking-widest text-volt font-semibold mb-2">Diagnóstico desta alavanca</p>
                <ul className="space-y-1.5 text-sm text-bone/90">
                  {diagnostico.map((d, i) => (
                    <li key={i} className="flex gap-2 break-words"><span className="text-volt">▸</span>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">
                  Perguntas profundas · {answered}/{questions.length} respondidas
                </p>
                {savingAnswers && <span className="text-[10px] text-white/40 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> salvando…</span>}
              </div>
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id} className="rounded-lg border border-white/10 bg-graphite/40 p-4">
                    <label className="block">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-volt font-mono text-xs mt-0.5">{String(idx + 1).padStart(2, "0")}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-bone break-words">{q.pergunta}</p>
                          {q.contexto && <p className="text-[11px] text-white/50 mt-0.5 break-words">{q.contexto}</p>}
                        </div>
                      </div>
                      <Textarea
                        value={answers[q.id] || ""}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                        placeholder="Responda com o máximo de especificidade que conseguir…"
                        className="min-h-[80px] bg-carbon/60 border-white/10 text-bone placeholder:text-white/30 focus:border-volt focus:ring-volt/30"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {compiledPrompt && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <p className="text-[11px] uppercase tracking-widest text-emerald-300 font-semibold">Prompt de aceleração compilado</p>
                </div>
                <pre className="text-xs text-bone/85 whitespace-pre-wrap break-words font-sans leading-relaxed max-h-72 overflow-y-auto">{compiledPrompt}</pre>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2 pt-2 border-t border-white/10">
          <Button variant="outline" className="bg-transparent border-white/20 text-bone hover:bg-white/5" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={handleCompile}
            disabled={compiling || loading || !canCompile}
            className="bg-volt text-carbon hover:bg-volt/90 font-semibold"
          >
            {compiling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {compiledPrompt ? "Recompilar prompt" : "Salvar e gerar prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
