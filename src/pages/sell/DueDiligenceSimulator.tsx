import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CheckSquare, Info, ArrowLeft, ArrowRight, Check, X, Flag, Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  DD_SECTORS, DD_TOTAL_ITEMS, DDAnswers, ddClassify, ddSectorProgress, ddYesCount, sectorColor,
} from '@/lib/sellSimulators';
import { useDDActions, useDDAudits, useDDDebouncedSave } from '@/hooks/useDueDiligence';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Phase = 'intro' | 'running' | 'result';

const SECTOR_PIE_COLORS = ['#D9F564', '#22d3ee', '#a78bfa', '#f97316', '#ec4899', '#10b981', '#fbbf24', '#60a5fa', '#fb7185'];

export default function DueDiligenceSimulator() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { create, save } = useDDActions();
  const { data: history } = useDDAudits(10);

  const [phase, setPhase] = useState<Phase>('intro');
  const [auditId, setAuditId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<DDAnswers>({});
  const [sectorIdx, setSectorIdx] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate('/auth?redirect=/vender/due-diligence');
  }, [user, loading, navigate]);

  useDDDebouncedSave(phase === 'running' ? auditId : null, answers);

  const yesCount = useMemo(() => ddYesCount(answers), [answers]);
  const pct = DD_TOTAL_ITEMS > 0 ? Math.round((yesCount / DD_TOTAL_ITEMS) * 100) : 0;
  const totalAnswered = useMemo(() => {
    let n = 0;
    for (const sec of DD_SECTORS) {
      const block = answers[sec.id] || {};
      for (const item of sec.items) if (typeof block[item.id] === 'boolean') n++;
    }
    return n;
  }, [answers]);

  async function handleStart() {
    try {
      const a = await create.mutateAsync();
      setAuditId(a.id);
      setAnswers({});
      setSectorIdx(0);
      setPhase('running');
    } catch (e: any) {
      toast.error('Não foi possível iniciar', { description: e?.message });
    }
  }

  function handleContinue(audit: any) {
    setAuditId(audit.id);
    setAnswers((audit.answers as DDAnswers) || {});
    setSectorIdx(0);
    setPhase('running');
  }

  function setItem(sectorId: string, itemId: string, value: boolean) {
    setAnswers(prev => {
      const next = { ...prev, [sectorId]: { ...(prev[sectorId] || {}), [itemId]: value } };
      return next;
    });
  }

  async function handleFinish() {
    if (!auditId) return;
    await save.mutateAsync({ id: auditId, answers, completed: true });
    toast.success('Auditoria concluída!');
    setPhase('result');
  }

  function handleRetry() {
    setPhase('intro');
    setAuditId(null);
    setAnswers({});
    setSectorIdx(0);
  }

  if (loading || !user) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;
  }

  // INTRO
  if (phase === 'intro') {
    const incomplete = (history || []).filter((h: any) => !h.completed);
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/10"><CheckSquare className="h-6 w-6 text-accent" /></div>
              <div>
                <CardTitle className="text-2xl">Simulador Due Diligence</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Auditoria de informações</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p>
              Responda <strong>SIM</strong> ou <strong>NÃO</strong> para cada item. Esta é uma auditoria privada para você saber que documentos/informações teria disponível em uma negociação real.
            </p>
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 flex gap-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm">Suas respostas são <strong>privadas</strong> e não são compartilhadas com ninguém. Servem apenas para diagnóstico.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded border border-border"><div className="text-2xl font-bold">{DD_SECTORS.length}</div><div className="text-xs text-muted-foreground">setores</div></div>
              <div className="p-3 rounded border border-border"><div className="text-2xl font-bold">{DD_TOTAL_ITEMS}</div><div className="text-xs text-muted-foreground">itens</div></div>
              <div className="p-3 rounded border border-border"><div className="text-2xl font-bold">~15 min</div><div className="text-xs text-muted-foreground">duração</div></div>
            </div>
            <Button size="lg" onClick={handleStart} disabled={create.isPending} className="w-full">
              {create.isPending ? 'Iniciando...' : 'Iniciar Auditoria'}
            </Button>

            {incomplete.length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-2">Auditoria em andamento:</p>
                {incomplete.slice(0, 1).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="text-sm">
                      <div className="font-medium">{format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                      <div className="text-muted-foreground text-xs">{a.yes_count} de {a.total_items} itens com SIM</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleContinue(a)}>Continuar</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {history && history.filter((h: any) => h.completed).length > 0 && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-lg">Histórico de auditorias</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {history.filter((h: any) => h.completed).map((h: any) => {
                const k = ddClassify(Number(h.score_pct));
                return (
                  <div key={h.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{format(new Date(h.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums font-semibold">{Math.round(Number(h.score_pct))}%</span>
                      <span className={k.color}>{k.emoji}</span>
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
  if (phase === 'running') {
    const sec = DD_SECTORS[sectorIdx];
    const block = answers[sec.id] || {};
    const sp = ddSectorProgress(answers, sec.id);

    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center justify-between mb-1.5 text-sm">
              <span className="text-muted-foreground">{totalAnswered} de {DD_TOTAL_ITEMS} itens verificados</span>
              <span className="font-semibold tabular-nums">{Math.round((totalAnswered / DD_TOTAL_ITEMS) * 100)}%</span>
            </div>
            <Progress value={(totalAnswered / DD_TOTAL_ITEMS) * 100} />
          </div>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">Sair</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sair sem concluir?</AlertDialogTitle>
                  <AlertDialogDescription>Sua auditoria fica salva e você pode continuar depois.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continuar auditando</AlertDialogCancel>
                  <AlertDialogAction onClick={() => navigate('/painel')}>Sair</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" onClick={handleFinish} disabled={save.isPending}>Concluir auditoria</Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-4">
          <Card className="self-start">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Setores</CardTitle></CardHeader>
            <CardContent className="space-y-1 p-2">
              {DD_SECTORS.map((s, i) => {
                const p = ddSectorProgress(answers, s.id);
                const sectorPct = p.total ? Math.round((p.yes / p.total) * 100) : 0;
                const isActive = i === sectorIdx;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSectorIdx(i)}
                    className={`w-full text-left p-2 rounded text-sm transition ${isActive ? 'bg-accent/15 border border-accent/40' : 'hover:bg-muted/50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium break-words">{s.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{p.answered}/{p.total}</span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full ${sectorColor(sectorPct)}`} style={{ width: `${sectorPct}%` }} />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg">{sec.name}</CardTitle>
                <Badge variant="secondary">{sp.yes} SIM · {sp.answered - sp.yes} NÃO · {sec.items.length - sp.answered} pendentes</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {sec.items.map(item => {
                const v = block[item.id];
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {item.critical && <Flag className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />}
                      <span className="text-sm break-words">{item.label}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant={v === true ? 'default' : 'outline'}
                        className={v === true ? 'bg-emerald-600 hover:bg-emerald-600/90' : ''}
                        onClick={() => setItem(sec.id, item.id, true)}
                      >
                        <Check className="h-4 w-4" />SIM
                      </Button>
                      <Button
                        size="sm"
                        variant={v === false ? 'default' : 'outline'}
                        className={v === false ? 'bg-red-600 hover:bg-red-600/90' : ''}
                        onClick={() => setItem(sec.id, item.id, false)}
                      >
                        <X className="h-4 w-4" />NÃO
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-3">
                <Button variant="outline" size="sm" disabled={sectorIdx === 0} onClick={() => setSectorIdx(sectorIdx - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" />Anterior
                </Button>
                {sectorIdx < DD_SECTORS.length - 1 ? (
                  <Button size="sm" onClick={() => setSectorIdx(sectorIdx + 1)}>
                    Próximo<ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleFinish} disabled={save.isPending}>
                    Concluir auditoria
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // RESULT
  if (phase === 'result') {
    const k = ddClassify(pct);
    const sectorData = DD_SECTORS.map(s => {
      const p = ddSectorProgress(answers, s.id);
      const sp = p.total ? Math.round((p.yes / p.total) * 100) : 0;
      return { name: s.name, value: sp, yes: p.yes, total: p.total };
    });
    const gaps = DD_SECTORS.flatMap(s => {
      const block = answers[s.id] || {};
      return s.items
        .filter(i => block[i.id] === false)
        .map(i => ({ sector: s.name, label: i.label, critical: !!i.critical }));
    });
    const critical = gaps.filter(g => g.critical);

    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultado da Auditoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="text-6xl font-bold tabular-nums">{pct}%</div>
            <Progress value={pct} className="h-3" />
            <div className={`text-xl ${k.color} font-semibold`}>{k.emoji} {k.label}</div>
            <div className="text-sm text-muted-foreground">{yesCount} SIM de {DD_TOTAL_ITEMS} itens auditados</div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Conclusão por setor</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(e: any) => `${e.value}%`}
                    >
                      {sectorData.map((_, i) => <Cell key={i} fill={SECTOR_PIE_COLORS[i % SECTOR_PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [`${v}%`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Detalhe por setor</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {sectorData.map((s, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="break-words">{s.name}</span>
                    <span className="tabular-nums text-muted-foreground">{s.yes}/{s.total} ({s.value}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${sectorColor(s.value)}`} style={{ width: `${s.value}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {gaps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Flag className="h-5 w-5 text-orange-500" />
                Gaps a resolver ({gaps.length})
                {critical.length > 0 && <Badge variant="destructive">{critical.length} red flags</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-96 overflow-auto">
                {[...critical, ...gaps.filter(g => !g.critical)].map((g, i) => (
                  <div key={i} className="text-sm flex items-start gap-2 p-2 rounded border border-border break-words">
                    {g.critical && <Flag className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                    <Badge variant="outline" className="shrink-0 text-[10px]">{g.sector}</Badge>
                    <span className="flex-1">{g.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2 justify-center print:hidden">
          <Button onClick={handleRetry} variant="outline"><RotateCcw className="h-4 w-4 mr-1" />Nova auditoria</Button>
          <Button onClick={() => window.print()} variant="outline"><Download className="h-4 w-4 mr-1" />Exportar relatório</Button>
          <Button onClick={() => navigate('/painel')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar ao painel</Button>
        </div>
      </div>
    );
  }

  return null;
}
