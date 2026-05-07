import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TrendingUp, AlertTriangle, X, RotateCcw, Save, ArrowLeft, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import {
  INVESTOR_QUESTIONS, InvestorAnswer, AnswerType,
  classifyInvestor, scoreFromAnswers,
} from '@/lib/sellSimulators';
import { useInvestorSim, useInvestorAttempts } from '@/hooks/useInvestorSim';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Phase = 'intro' | 'running' | 'result';

const MIN_COMPLETE = 20;
const MIN_PARTIAL = 5;

export default function InvestorSimulator() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { start, saveProgress, finish } = useInvestorSim();
  const { data: history } = useInvestorAttempts(5);

  const [phase, setPhase] = useState<Phase>('intro');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<InvestorAnswer[]>([]);
  const [type, setType] = useState<AnswerType | null>(null);
  const [text, setText] = useState('');
  const [finalScore, setFinalScore] = useState<{ score: number; score_final: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth?redirect=/vender/simulador-investidor');
  }, [user, loading, navigate]);

  const total = INVESTOR_QUESTIONS.length;
  const current = INVESTOR_QUESTIONS[idx];
  const liveScore = useMemo(() => scoreFromAnswers(answers).score, [answers]);

  const canAdvance =
    type === 'no_info' ||
    (type === 'complete' && text.trim().length >= MIN_COMPLETE) ||
    (type === 'partial' && text.trim().length >= MIN_PARTIAL);

  async function handleStart() {
    try {
      const a = await start.mutateAsync();
      setAttemptId(a.id);
      setAnswers([]);
      setIdx(0);
      setType(null);
      setText('');
      setPhase('running');
    } catch (e: any) {
      toast.error('Não foi possível iniciar', { description: e?.message });
    }
  }

  async function handleNext() {
    if (!canAdvance || !attemptId || !current) return;
    const ans: InvestorAnswer = { question_id: current.id, type: type!, text: type === 'no_info' ? undefined : text.trim() };
    const next = [...answers, ans];
    setAnswers(next);
    saveProgress.mutate({ id: attemptId, answers: next });

    if (idx + 1 >= total) {
      const r = await finish.mutateAsync({ id: attemptId, answers: next, abandoned: false });
      setFinalScore(r);
      setPhase('result');
      toast.success('Entrevista concluída!');
    } else {
      setIdx(idx + 1);
      setType(null);
      setText('');
    }
  }

  async function handleAbandon() {
    if (!attemptId) return;
    const r = await finish.mutateAsync({ id: attemptId, answers, abandoned: true });
    setFinalScore(r);
    setPhase('result');
    toast.warning('Entrevista abandonada — score com penalidade de 30%.');
  }

  function handleRetry() {
    setPhase('intro');
    setAttemptId(null);
    setAnswers([]);
    setIdx(0);
    setType(null);
    setText('');
    setFinalScore(null);
  }

  if (loading || !user) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;
  }

  // INTRO
  if (phase === 'intro') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/10"><TrendingUp className="h-6 w-6 text-accent" /></div>
              <div>
                <CardTitle className="text-2xl">Simulador Investidor</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Prepare-se para o pitch</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-foreground">
              Responda perguntas que investidores realmente fazem sobre sua empresa. Seu desempenho será avaliado e você receberá um score final baseado na qualidade das respostas.
            </p>
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/90">
                Abandonar a entrevista no meio será registrado como incapacidade técnica e <strong>reduzirá seu score final em 30%</strong>.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded border border-border"><div className="text-2xl font-bold">{total}</div><div className="text-xs text-muted-foreground">perguntas</div></div>
              <div className="p-3 rounded border border-border"><div className="text-2xl font-bold">~10 min</div><div className="text-xs text-muted-foreground">duração</div></div>
              <div className="p-3 rounded border border-border"><div className="text-2xl font-bold">{total * 10}</div><div className="text-xs text-muted-foreground">pontos máx.</div></div>
            </div>
            <Button size="lg" onClick={handleStart} disabled={start.isPending} className="w-full">
              {start.isPending ? 'Iniciando...' : 'Iniciar Entrevista'}
            </Button>
          </CardContent>
        </Card>

        {history && history.length > 0 && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-lg">Histórico (últimas 5)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {history.map((h: any) => {
                const k = classifyInvestor(h.score_final);
                return (
                  <div key={h.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                    <div className="flex items-center gap-3">
                      <span className={k.color + ' font-semibold tabular-nums'}>{h.score_final} pts</span>
                      <span>{k.emoji}</span>
                      {h.abandoned && <Badge variant="destructive" className="text-[10px]">Abandonado</Badge>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // RUNNING
  if (phase === 'running' && current) {
    const progress = ((idx) / total) * 100;
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-muted-foreground">Pergunta {idx + 1} de {total}</span>
              <span className="text-sm font-semibold">Score atual: <span className="text-accent tabular-nums">{liveScore}</span></span>
            </div>
            <Progress value={progress} />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="shrink-0"><X className="h-4 w-4 mr-1" />Sair</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza que quer sair?</AlertDialogTitle>
                <AlertDialogDescription>
                  Sair no meio demonstra incapacidade técnica e seu score será reduzido em <strong>30%</strong>.
                  Score atual: {liveScore} → final: {Math.floor(liveScore * 0.7)}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continuar</AlertDialogCancel>
                <AlertDialogAction onClick={handleAbandon} className="bg-destructive">Sair mesmo assim</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Card>
          <CardHeader>
            <Badge variant="secondary" className="self-start mb-2">{current.category}</Badge>
            <CardTitle className="text-xl leading-snug break-words">{current.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => setType('complete')}
                className={`p-3 rounded-lg border text-left text-sm transition ${type === 'complete' ? 'border-emerald-500 bg-emerald-500/10' : 'border-border hover:border-emerald-500/50'}`}
              >
                <div className="font-semibold">Resposta completa</div>
                <div className="text-xs text-muted-foreground">+10 pts · mín {MIN_COMPLETE} caracteres</div>
              </button>
              <button
                onClick={() => setType('partial')}
                className={`p-3 rounded-lg border text-left text-sm transition ${type === 'partial' ? 'border-yellow-500 bg-yellow-500/10' : 'border-border hover:border-yellow-500/50'}`}
              >
                <div className="font-semibold">Resposta parcial</div>
                <div className="text-xs text-muted-foreground">+5 pts · conhecimento básico</div>
              </button>
              <button
                onClick={() => { setType('no_info'); setText(''); }}
                className={`p-3 rounded-lg border text-left text-sm transition ${type === 'no_info' ? 'border-zinc-500 bg-zinc-500/10' : 'border-border hover:border-zinc-500/50'}`}
              >
                <div className="font-semibold">Não tenho esta informação</div>
                <div className="text-xs text-muted-foreground">0 pts · não penaliza</div>
              </button>
            </div>

            {type === 'complete' || type === 'partial' ? (
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={type === 'complete' ? 'Explique em detalhes...' : 'Explique brevemente...'}
                rows={type === 'complete' ? 6 : 3}
                maxLength={2000}
              />
            ) : type === 'no_info' ? (
              <p className="text-sm text-muted-foreground italic">Anotado que você não tem esta informação.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Selecione um tipo de resposta para continuar.</p>
            )}

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!canAdvance || finish.isPending}>
                {idx + 1 >= total ? 'Finalizar' : 'Próxima pergunta'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // RESULT
  if (phase === 'result' && finalScore) {
    const k = classifyInvestor(finalScore.score_final);
    const maxScore = total * 10;
    const pct = Math.min(100, (finalScore.score_final / maxScore) * 100);
    const incomplete = INVESTOR_QUESTIONS.filter(q => {
      const a = answers.find(x => x.question_id === q.id);
      return !a || a.type !== 'complete';
    });

    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-accent/10 mb-2"><Trophy className="h-8 w-8 text-accent" /></div>
            <CardTitle className="text-3xl">Resultado final</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div>
              <div className="text-6xl font-bold tabular-nums">{finalScore.score_final}</div>
              <div className="text-sm text-muted-foreground">de {maxScore} pontos possíveis</div>
              {finalScore.score !== finalScore.score_final && (
                <div className="text-xs text-destructive mt-1">Penalidade de abandono: {finalScore.score} → {finalScore.score_final}</div>
              )}
            </div>
            <Progress value={pct} className="h-3" />
            <div className={`text-xl ${k.color} font-semibold`}>{k.emoji} {k.label}</div>
          </CardContent>
        </Card>

        {incomplete.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Perguntas para estudar</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Você não teve resposta completa nestas perguntas:</p>
              <ul className="space-y-2">
                {incomplete.map(q => (
                  <li key={q.id} className="text-sm flex gap-2 break-words">
                    <Badge variant="outline" className="shrink-0 text-[10px]">{q.category}</Badge>
                    <span>{q.question}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2 justify-center">
          <Button onClick={handleRetry} variant="outline"><RotateCcw className="h-4 w-4 mr-1" />Tentar novamente</Button>
          <Button onClick={() => toast.success('Resultado já está salvo no seu histórico')} variant="outline"><Save className="h-4 w-4 mr-1" />Salvar resultado</Button>
          <Button onClick={() => navigate('/painel')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar ao painel</Button>
        </div>
      </div>
    );
  }

  return null;
}
