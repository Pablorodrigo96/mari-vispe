import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Sparkles, FileText, Loader2, Wand2, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { DIMENSOES, PORTE_OPTIONS, ARQUETIPOS_LABEL } from "@/lib/equity-planner/constants";
import EquityDocsUpload from "@/components/equity-planner/EquityDocsUpload";

type Mode = "wizard" | "meeting_paste";
type Step = 0 | 1 | 2 | 3 | 4 | 5;

interface Classification {
  arquetipo_id: string;
  confianca: number;
  justificativa: string;
  sinais_detectados?: string[];
  migracao_sugerida?: {
    para_arquetipo_id?: string | null;
    racional?: string;
    viabilidade?: string;
  } | null;
}

export default function EquityPlannerNew() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [mode, setMode] = useState<Mode>("wizard");
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [draftAssessmentId, setDraftAssessmentId] = useState<string | null>(null);
  const [chosenArquetipo, setChosenArquetipo] = useState<string>("");

  // Company data
  const [razao, setRazao] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [setor, setSetor] = useState("");
  const [porte, setPorte] = useState("pequena");
  const [uf, setUf] = useState("");

  // Wizard scores (start at 50)
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(DIMENSOES.map((d) => [d.key, 50]))
  );
  const [faturamento, setFaturamento] = useState("");
  const [ebitda, setEbitda] = useState("");
  const [observ, setObserv] = useState("");

  // Meeting paste
  const [meetingText, setMeetingText] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?next=/equity-planner/novo", { replace: true });
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-volt" />
      </div>
    );
  }
  if (!user) return null;

  const buildIntakeText = (): string => {
    if (mode === "meeting_paste") return meetingText;
    const lines = [
      `Empresa: ${razao || "(não informado)"}`,
      `CNPJ: ${cnpj || "(não informado)"} · Setor: ${setor || "(não informado)"} · UF: ${uf || "—"} · Porte: ${porte}`,
      `Faturamento anual declarado: ${faturamento || "(não informado)"}`,
      `EBITDA declarado: ${ebitda || "(não informado)"}`,
      "",
      "Auto-avaliação do dono nas 12 dimensões (0=péssimo, 100=excelente):",
      ...DIMENSOES.map((d) => `- ${d.label}: ${scores[d.key]}`),
      "",
      "Observações livres do empresário:",
      observ || "(sem observações)",
    ];
    return lines.join("\n");
  };

  const ensureDraft = async (): Promise<string> => {
    if (draftAssessmentId) return draftAssessmentId;
    const { data: company, error: cErr } = await supabase
      .from("equity_companies")
      .insert({
        user_id: user.id,
        razao_social: razao || null,
        cnpj: cnpj || null,
        setor_livre: setor || null,
        porte,
        uf: uf || null,
      })
      .select("id")
      .single();
    if (cErr) throw cErr;

    const { data: assess, error: aErr } = await supabase
      .from("equity_assessments")
      .insert({
        user_id: user.id,
        company_id: company.id,
        source: mode,
        raw_intake: { mode, scores, faturamento, ebitda, observ, meetingText, razao, cnpj, setor, porte, uf },
        status: "draft",
      })
      .select("id")
      .single();
    if (aErr) throw aErr;
    setDraftAssessmentId(assess.id);
    return assess.id;
  };

  const invokeWithTimeout = async <T,>(
    fn: string,
    body: any,
    timeoutMs: number,
  ): Promise<T> => {
    return await Promise.race([
      supabase.functions.invoke(fn, { body }) as Promise<T>,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Tempo esgotado (${Math.round(timeoutMs / 1000)}s). Tente novamente.`)),
          timeoutMs,
        ),
      ),
    ]);
  };

  const runClassifier = async () => {
    if (!razao && !cnpj) {
      toast.error("Preencha razão social ou CNPJ na etapa 1.");
      return;
    }
    setClassifying(true);
    try {
      const id = await ensureDraft();
      const intakeText = buildIntakeText();
      const { data, error } = await invokeWithTimeout<any>(
        "equity-planner-classify",
        {
          assessmentId: id,
          intakeText,
          companyData: {
            razao_social: razao,
            cnpj,
            setor_livre: setor,
            porte,
            uf,
            faturamento_declarado: faturamento,
            ebitda_declarado: ebitda,
          },
        },
        60_000,
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.classification) throw new Error("Resposta vazia do classificador.");
      setClassification(data.classification);
      setChosenArquetipo(data.classification.arquetipo_id);
      setStep(4);
    } catch (e: any) {
      console.error("[equity-planner-classify]", e);
      toast.error("Falha ao classificar: " + (e?.message || "erro"));
    } finally {
      setClassifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!draftAssessmentId) {
      toast.error("Rode a classificação antes de gerar.");
      return;
    }
    setLoading(true);
    try {
      // Permite override do arquétipo escolhido pelo usuário
      if (classification && chosenArquetipo && chosenArquetipo !== classification.arquetipo_id) {
        await supabase.from("equity_assessments").update({
          archetype_classification: { ...classification, arquetipo_id: chosenArquetipo, user_overridden: true },
          arquetipo_sugerido: chosenArquetipo,
        }).eq("id", draftAssessmentId);
      }

      const intakeText = buildIntakeText();
      toast.info("Calculando IPE, valuation e plano…", { duration: 5000 });
      const { data: out, error: fErr } = await supabase.functions.invoke("equity-planner-compute", {
        body: {
          assessmentId: draftAssessmentId,
          intakeText,
          companyData: { razao_social: razao, cnpj, setor_livre: setor, porte, uf,
            faturamento_declarado: faturamento, ebitda_declarado: ebitda },
        },
      });
      if (fErr) throw fErr;
      if (out?.error) throw new Error(out.error);

      toast.success("Diagnóstico pronto!");
      navigate(`/equity-planner/${draftAssessmentId}`);
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao gerar diagnóstico: " + (e?.message || "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / 6) * 100;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">Equity Planner · Novo diagnóstico</p>
          <Progress value={progress} className="h-1.5" />
        </div>

        <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-6">
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Como vamos entrar com os dados?</h2>
              <p className="text-muted-foreground mb-6">Você pode responder um intake guiado ou colar o diagnóstico de uma reunião com nosso time.</p>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="space-y-3">
                <label className="flex items-start gap-3 p-4 border border-volt/20 rounded-lg cursor-pointer hover:bg-volt/5">
                  <RadioGroupItem value="wizard" className="mt-1" />
                  <div>
                    <div className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-volt"/> Intake guiado</div>
                    <p className="text-sm text-muted-foreground break-words">Você responde uma auto-avaliação nas 12 dimensões. ~5 min.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 border border-volt/20 rounded-lg cursor-pointer hover:bg-volt/5">
                  <RadioGroupItem value="meeting_paste" className="mt-1" />
                  <div>
                    <div className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-volt"/> Colar diagnóstico de reunião</div>
                    <p className="text-sm text-muted-foreground break-words">Cole a transcrição ou ata da sessão. A IA extrai e preenche o data model.</p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Identificação da empresa</h2>
              <div>
                <Label>Razão social</Label>
                <Input value={razao} onChange={(e) => setRazao(e.target.value)} placeholder="Ex.: ACME Indústria Ltda" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CNPJ</Label>
                  <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <Label>UF</Label>
                  <Input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0,2))} placeholder="SP" />
                </div>
              </div>
              <div>
                <Label>Setor livre</Label>
                <Input value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Ex.: provedor de internet, consultoria de TI, construtora..." />
              </div>
              <div>
                <Label>Porte</Label>
                <select className="w-full bg-background border border-input rounded-md p-2 mt-1" value={porte} onChange={(e) => setPorte(e.target.value)}>
                  {PORTE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Dados financeiros (declarado)</h2>
              <p className="text-sm text-muted-foreground">Ordens de grandeza bastam — a IA vai normalizar e marcar lacunas.</p>
              <div>
                <Label>Faturamento anual (R$)</Label>
                <Input value={faturamento} onChange={(e) => setFaturamento(e.target.value)} placeholder="Ex.: 12000000" />
              </div>
              <div>
                <Label>EBITDA estimado (R$)</Label>
                <Input value={ebitda} onChange={(e) => setEbitda(e.target.value)} placeholder="Ex.: 1800000" />
              </div>
            </div>
          )}

          {step === 3 && mode === "wizard" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Auto-avaliação (0 a 100)</h2>
              <p className="text-sm text-muted-foreground">Honestidade aqui = qualidade do diagnóstico.</p>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {DIMENSOES.map((d) => (
                  <div key={d.key}>
                    <div className="flex justify-between items-center mb-1">
                      <Label className="break-words">{d.label}</Label>
                      <span className="text-volt font-mono text-sm">{scores[d.key]}</span>
                    </div>
                    <Slider value={[scores[d.key]]} min={0} max={100} step={5}
                      onValueChange={(v) => setScores((s) => ({ ...s, [d.key]: v[0] }))} />
                    <p className="text-xs text-muted-foreground mt-1 break-words">{d.hint}</p>
                  </div>
                ))}
              </div>
              <Textarea value={observ} onChange={(e) => setObserv(e.target.value)} className="min-h-[100px]"
                placeholder="Observações livres (opcional)..." />
            </div>
          )}

          {step === 3 && mode === "meeting_paste" && (
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">Cole o diagnóstico da reunião</h2>
              <p className="text-sm text-muted-foreground">Transcrição, ata, notas — texto livre. A IA extrai os sinais.</p>
              <Textarea
                value={meetingText} onChange={(e) => setMeetingText(e.target.value)}
                placeholder="Cole aqui a transcrição da reunião de diagnóstico…"
                className="min-h-[300px]"
              />
            </div>
          )}

          {/* Step 4 — Classificação de Arquétipo via IA */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-volt" /> Classificação de Arquétipo
              </h2>
              <p className="text-sm text-muted-foreground">
                Antes de gerar o diagnóstico completo, a IA detecta o modelo econômico (arquétipo) da empresa.
                Você pode confirmar ou trocar a escolha.
              </p>

              {!classification ? (
                <Button className="bg-volt text-carbon hover:bg-volt/90 w-full" disabled={classifying} onClick={runClassifier}>
                  {classifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando…</> : <>Rodar classificador <Sparkles className="ml-2 h-4 w-4" /></>}
                </Button>
              ) : (
                <div className="space-y-4">
                  <Card className="!bg-slate-950/40 border-volt/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-volt text-carbon">
                        {ARQUETIPOS_LABEL[classification.arquetipo_id] || classification.arquetipo_id}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Confiança: {Math.round((classification.confianca || 0) * 100)}%
                      </span>
                    </div>
                    <p className="text-sm break-words">{classification.justificativa}</p>
                    {classification.sinais_detectados && classification.sinais_detectados.length > 0 && (
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {classification.sinais_detectados.map((s, i) => (
                          <li key={i} className="break-words">• {s}</li>
                        ))}
                      </ul>
                    )}
                  </Card>

                  {classification.migracao_sugerida?.para_arquetipo_id && (
                    <Card className="!bg-volt/5 border-volt/40 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Rocket className="h-4 w-4 text-volt" />
                        <span className="font-semibold text-sm">Migração de arquétipo sugerida</span>
                        <Badge variant="outline" className="border-volt/40 text-volt">
                          → {ARQUETIPOS_LABEL[classification.migracao_sugerida.para_arquetipo_id] || classification.migracao_sugerida.para_arquetipo_id}
                        </Badge>
                      </div>
                      <p className="text-sm break-words text-muted-foreground">
                        {classification.migracao_sugerida.racional}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Viabilidade: <span className="text-volt">{classification.migracao_sugerida.viabilidade}</span>
                      </p>
                    </Card>
                  )}

                  <div>
                    <Label className="text-sm">Confirmar ou trocar o arquétipo atual:</Label>
                    <select
                      className="w-full bg-background border border-input rounded-md p-2 mt-1"
                      value={chosenArquetipo}
                      onChange={(e) => setChosenArquetipo(e.target.value)}
                    >
                      {Object.entries(ARQUETIPOS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Pronto para gerar o diagnóstico</h2>
              <div className="text-sm bg-volt/5 border border-volt/20 rounded p-4 space-y-2 break-words">
                <p><strong>Arquétipo:</strong> {ARQUETIPOS_LABEL[chosenArquetipo] || chosenArquetipo}</p>
                <p><strong>Modo de entrada:</strong> {mode === "wizard" ? "Intake guiado" : "Diagnóstico colado"}</p>
                <p className="text-muted-foreground">
                  Vamos gerar Raio-X (12 dimensões), Valuation com Value Bridge, plano em sprints
                  e mapa de compradores. Leva ~30 segundos.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <Button variant="outline" className="bg-transparent" disabled={step === 0 || loading || classifying} onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            {step < 3 && (
              <Button className="bg-volt text-carbon hover:bg-volt/90" onClick={() => setStep((s) => (s + 1) as Step)}>
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 3 && (
              <Button className="bg-volt text-carbon hover:bg-volt/90" disabled={classifying} onClick={runClassifier}>
                {classifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Classificando…</> : <>Classificar arquétipo <Wand2 className="ml-2 h-4 w-4" /></>}
              </Button>
            )}
            {step === 4 && classification && (
              <Button className="bg-volt text-carbon hover:bg-volt/90" onClick={() => setStep(5)}>
                Avançar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 5 && (
              <Button className="bg-volt text-carbon hover:bg-volt/90" disabled={loading} onClick={handleSubmit}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando…</> : <>Gerar diagnóstico <Sparkles className="ml-2 h-4 w-4" /></>}
              </Button>
            )}
          </div>
        </Card>

        {(step === 3 || step === 4 || step === 5) && draftAssessmentId && (
          <div className="mt-4">
            <EquityDocsUpload assessmentId={draftAssessmentId} compact />
          </div>
        )}
      </div>
    </div>
  );
}
