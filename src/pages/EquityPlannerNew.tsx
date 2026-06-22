import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight, ArrowLeft, Sparkles, FileText, Loader2, Wand2, Rocket, Info, Building2, LineChart, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { DIMENSOES, PORTE_OPTIONS, ARQUETIPOS_LABEL } from "@/lib/equity-planner/constants";
import EquityDocsUpload from "@/components/equity-planner/EquityDocsUpload";
import WizardShell from "@/components/equity-planner/WizardShell";
import SignupGateCard from "@/components/equity-planner/SignupGateCard";

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

const DRAFT_KEY = "equity_planner_draft_v1";
const DRAFT_TTL_MS = 60 * 60 * 1000; // 1h

const STEPS = [
  { label: "Modo de entrada", sub: "Wizard guiado ou texto livre" },
  { label: "Identificação", sub: "Empresa, setor, porte" },
  { label: "Financeiro", sub: "Faturamento + EBITDA" },
  { label: "Auto-avaliação", sub: "12 dimensões de prontidão" },
  { label: "Arquétipo", sub: "Classificação IA" },
  { label: "Gerar diagnóstico", sub: "IPE, valuation e plano" },
];

// Inputs sem caixa cinza — underline volt
const inputStyle =
  "bg-transparent border-0 border-b-2 border-white/15 rounded-none px-0 h-11 text-bone placeholder:text-white/30 focus-visible:ring-0 focus-visible:border-volt transition-colors text-base";

export default function EquityPlannerNew() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeRequested = searchParams.get("resume") === "1";

  const [step, setStep] = useState<Step>(0);
  const [mode, setMode] = useState<Mode>("wizard");
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [draftAssessmentId, setDraftAssessmentId] = useState<string | null>(null);
  const [chosenArquetipo, setChosenArquetipo] = useState<string>("");

  const [razao, setRazao] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [setor, setSetor] = useState("");
  const [porte, setPorte] = useState("pequena");
  const [uf, setUf] = useState("");

  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(DIMENSOES.map((d) => [d.key, 50]))
  );
  const [faturamento, setFaturamento] = useState("");
  const [ebitda, setEbitda] = useState("");
  const [observ, setObserv] = useState("");

  const [meetingText, setMeetingText] = useState("");

  const hydratedRef = useRef(false);
  const autoRunRef = useRef(false);

  // ===== Background market scan =====
  const [marketScanStatus, setMarketScanStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const marketScanRef = useRef<{ key: string | null; timer: any }>({ key: null, timer: null });

  useEffect(() => {
    if (!user) return;
    const cnpjClean = cnpj.replace(/\D/g, "");
    const hasEnough = (razao && razao.trim().length >= 3) || cnpjClean.length === 14;
    if (!hasEnough) return;
    const key = `${razao.trim()}|${cnpjClean}`;
    if (marketScanRef.current.key === key) return;
    if (marketScanRef.current.timer) clearTimeout(marketScanRef.current.timer);
    marketScanRef.current.timer = setTimeout(async () => {
      marketScanRef.current.key = key;
      setMarketScanStatus("running");
      try {
        const { data, error } = await supabase.functions.invoke("equity-market-scan", {
          body: {
            razao_social: razao,
            cnpj,
            assessment_id: draftAssessmentId,
            faturamento_declarado: faturamento,
          },
        });
        if (error || data?.error) {
          setMarketScanStatus("error");
        } else {
          setMarketScanStatus("done");
        }
      } catch {
        setMarketScanStatus("error");
      }
    }, 1500);
    return () => {
      if (marketScanRef.current.timer) clearTimeout(marketScanRef.current.timer);
    };
  }, [razao, cnpj, user, draftAssessmentId, faturamento]);

  // Re-link scan to assessment once draft is created
  useEffect(() => {
    if (!draftAssessmentId || !user) return;
    const cnpjClean = cnpj.replace(/\D/g, "");
    if (!cnpjClean) return;
    void supabase
      .from("equity_market_scans")
      .update({ assessment_id: draftAssessmentId })
      .eq("user_id", user.id)
      .eq("cnpj", cnpjClean)
      .is("assessment_id", null);
  }, [draftAssessmentId, cnpj, user]);

  // ===== Hydrate from sessionStorage on mount =====
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed?.savedAt || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
        sessionStorage.removeItem(DRAFT_KEY);
        return;
      }
      const d = parsed.data || {};
      if (d.mode) setMode(d.mode);
      if (d.razao !== undefined) setRazao(d.razao);
      if (d.cnpj !== undefined) setCnpj(d.cnpj);
      if (d.setor !== undefined) setSetor(d.setor);
      if (d.porte) setPorte(d.porte);
      if (d.uf !== undefined) setUf(d.uf);
      if (d.scores) setScores(d.scores);
      if (d.faturamento !== undefined) setFaturamento(d.faturamento);
      if (d.ebitda !== undefined) setEbitda(d.ebitda);
      if (d.observ !== undefined) setObserv(d.observ);
      if (d.meetingText !== undefined) setMeetingText(d.meetingText);
      if (d.chosenArquetipo) setChosenArquetipo(d.chosenArquetipo);
      if (typeof d.step === "number") setStep(d.step as Step);
    } catch (e) {
      console.warn("hydrate failed", e);
    }
  }, []);

  // ===== Persist on change =====
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          data: {
            mode, razao, cnpj, setor, porte, uf, scores,
            faturamento, ebitda, observ, meetingText, chosenArquetipo, step,
          },
        })
      );
    } catch (_) { /* noop */ }
  }, [mode, razao, cnpj, setor, porte, uf, scores, faturamento, ebitda, observ, meetingText, chosenArquetipo, step]);

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

  const ensureDraft = async (currentUserId: string): Promise<string> => {
    if (draftAssessmentId) return draftAssessmentId;
    const { data: company, error: cErr } = await supabase
      .from("equity_companies")
      .insert({
        user_id: currentUserId,
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
        user_id: currentUserId,
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

  const invokeWithTimeout = async <T,>(fn: string, body: any, timeoutMs: number): Promise<T> => {
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

  const runClassifierAndCompute = async () => {
    if (!user) return;
    if (!razao && !cnpj) {
      toast.error("Preencha razão social ou CNPJ.");
      setStep(1);
      return;
    }
    setLoading(true);
    setClassifying(true);
    try {
      const id = await ensureDraft(user.id);
      const intakeText = buildIntakeText();

      // 1) classificar — falha não bloqueia o compute
      try {
        const { data: clsData, error: clsErr } = await invokeWithTimeout<any>(
          "equity-planner-classify",
          {
            assessmentId: id,
            intakeText,
            companyData: {
              razao_social: razao, cnpj, setor_livre: setor, porte, uf,
              faturamento_declarado: faturamento, ebitda_declarado: ebitda,
            },
          },
          60_000,
        );
        if (clsErr) throw clsErr;
        if (clsData?.error) throw new Error(clsData.error);
        const cls: Classification | null = clsData?.classification || null;
        if (cls) {
          setClassification(cls);
          if (!chosenArquetipo) setChosenArquetipo(cls.arquetipo_id);
        }
      } catch (clsFail: any) {
        console.warn("classify failed, continuing with default", clsFail);
        toast.message("Classificação automática indisponível — seguindo com arquétipo padrão.");
      }
      setClassifying(false);

      // 2) computar
      toast.info("Gerando IPE, valuation e plano…", { duration: 5000 });
      const { data: out, error: fErr } = await invokeWithTimeout<any>(
        "equity-planner-compute",
        {
          assessmentId: id,
          intakeText,
          companyData: {
            razao_social: razao, cnpj, setor_livre: setor, porte, uf,
            faturamento_declarado: faturamento, ebitda_declarado: ebitda,
          },
        },
        120_000,
      );
      if (fErr) throw fErr;
      if (out?.error) throw new Error(out.error);

      // Aguarda scan terminar (máx 10s) para o painel "Mapeamento" já aparecer no diagnóstico
      const waitStart = Date.now();
      while (marketScanStatus === "running" && Date.now() - waitStart < 10_000) {
        await new Promise((r) => setTimeout(r, 500));
      }

      sessionStorage.removeItem(DRAFT_KEY);
      toast.success("Diagnóstico pronto!");
      navigate(`/equity-planner/${id}`);
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao gerar diagnóstico: " + (e?.message || "erro"));
    } finally {
      setLoading(false);
      setClassifying(false);
    }
  };

  // ===== Auto-run after login if user returned with ?resume=1 =====
  useEffect(() => {
    if (autoRunRef.current) return;
    if (!hydratedRef.current) return;
    if (authLoading) return;
    if (!user) return;
    if (!resumeRequested) return;
    if (step < 3) return;
    autoRunRef.current = true;
    // pequeno delay pra UI montar
    setTimeout(() => { void runClassifierAndCompute(); }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, resumeRequested, step]);

  const goNext = () => setStep((s) => Math.min(5, s + 1) as Step);
  const goBack = () => setStep((s) => Math.max(0, s - 1) as Step);

  const handleGenerateClick = () => {
    if (!user) {
      // gate — salva rascunho (já está salvo) e abre signup
      return;
    }
    void runClassifierAndCompute();
  };

  // ===== Render =====
  const footer = (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="outline"
        className="bg-transparent border-white/15 text-bone hover:bg-white/5 hover:text-bone h-11 px-5 rounded-xl disabled:opacity-30"
        disabled={step === 0 || loading || classifying}
        onClick={goBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      {step < 3 && (
        <Button
          className="bg-volt hover:bg-volt-light text-carbon font-bold h-11 px-6 rounded-xl shadow-volt"
          onClick={goNext}
        >
          Próximo <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
      {step === 3 && (
        <Button
          className="bg-volt hover:bg-volt-light text-carbon font-bold h-11 px-6 rounded-xl shadow-volt"
          onClick={goNext}
        >
          Avançar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
      {step === 4 && (
        <Button
          className="bg-volt hover:bg-volt-light text-carbon font-bold h-11 px-6 rounded-xl shadow-volt"
          onClick={goNext}
        >
          Avançar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
      {step === 5 && user && (
        <Button
          className="bg-volt hover:bg-volt-light text-carbon font-bold h-11 px-6 rounded-xl shadow-volt"
          disabled={loading}
          onClick={handleGenerateClick}
        >
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando…</>
          ) : (
            <>Gerar diagnóstico <Sparkles className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      )}
    </div>
  );

  const stepHeader = (eyebrow: string, title: string, subtitle?: string) => (
    <div className="mb-8">
      <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-volt mb-3">
        {eyebrow}
      </p>
      <h1 className="text-3xl md:text-4xl font-bold tracking-[-0.02em] leading-[1.1] break-words">
        {title}
      </h1>
      {subtitle && (
        <p className="text-white/55 mt-3 leading-relaxed break-words">{subtitle}</p>
      )}
    </div>
  );

  // Loading overlay during auto-run after login
  if (resumeRequested && user && loading) {
    return (
      <div className="min-h-[100dvh] bg-carbon text-bone flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <Loader2 className="h-10 w-10 animate-spin text-volt mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Gerando seu diagnóstico…</h2>
          <p className="text-white/60 text-sm break-words">
            Classificando o arquétipo, calculando IPE e valuation, montando o
            plano em sprints. Leva até 30 segundos.
          </p>
        </div>
      </div>
    );
  }

  const statusChip = marketScanStatus === "idle" ? null : (
    <div className={[
      "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-medium backdrop-blur-md",
      marketScanStatus === "running" && "bg-carbon/80 border-volt/30 text-volt",
      marketScanStatus === "done" && "bg-carbon/80 border-emerald-400/30 text-emerald-300",
      marketScanStatus === "error" && "bg-carbon/80 border-white/15 text-white/50",
    ].filter(Boolean).join(" ")}>
      {marketScanStatus === "running" && <><Loader2 className="h-3 w-3 animate-spin" /> Pesquisando mercado…</>}
      {marketScanStatus === "done" && <><Sparkles className="h-3 w-3" /> Mapeamento pronto</>}
      {marketScanStatus === "error" && <>Pesquisa indisponível</>}
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <WizardShell step={step} steps={STEPS} stepKey={step} footer={footer} statusChip={statusChip}>

        {/* STEP 0 */}
        {step === 0 && (
          <div>
            {stepHeader(
              "Passo 1",
              "Como vamos entrar com os dados?",
              "Você pode responder uma auto-avaliação guiada ou colar o diagnóstico de uma reunião com o time Mari."
            )}

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setMode("wizard")}
                className={[
                  "text-left p-5 rounded-xl border transition-all",
                  mode === "wizard"
                    ? "border-volt bg-volt/5 shadow-[0_0_32px_-12px_hsl(72_86%_68%/0.5)]"
                    : "border-white/10 bg-graphite/30 hover:border-white/25",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-volt/10 border border-volt/20 flex items-center justify-center text-volt shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-bone">Intake guiado</div>
                    <p className="text-sm text-white/55 mt-1 break-words">
                      Você responde a auto-avaliação nas 12 dimensões. ~5 minutos.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("meeting_paste")}
                className={[
                  "text-left p-5 rounded-xl border transition-all",
                  mode === "meeting_paste"
                    ? "border-volt bg-volt/5 shadow-[0_0_32px_-12px_hsl(72_86%_68%/0.5)]"
                    : "border-white/10 bg-graphite/30 hover:border-white/25",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-volt/10 border border-volt/20 flex items-center justify-center text-volt shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-bone">Colar diagnóstico de reunião</div>
                    <p className="text-sm text-white/55 mt-1 break-words">
                      Cole a transcrição ou ata da sessão. A IA extrai os sinais e preenche o modelo.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            {stepHeader(
              "Passo 2",
              "Identifique a empresa.",
              "Use o nome real. Tudo segue sob NDA implícito e fica anonimizado no marketplace."
            )}
            <div className="space-y-6">
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold">Razão social</Label>
                <Input className={inputStyle} value={razao} onChange={(e) => setRazao(e.target.value)} placeholder="ACME Indústria Ltda" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-5">
                <div>
                  <Label className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold">CNPJ</Label>
                  <Input className={inputStyle} value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold">UF</Label>
                  <Input className={inputStyle} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" />
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold">Setor</Label>
                <Input className={inputStyle} value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Provedor de internet, consultoria de TI, indústria..." />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold">Porte</Label>
                <select
                  className="mt-2 w-full bg-transparent border-0 border-b-2 border-white/15 focus:border-volt outline-none h-11 text-bone text-base appearance-none"
                  value={porte}
                  onChange={(e) => setPorte(e.target.value)}
                >
                  {PORTE_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value} className="bg-carbon">
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            {stepHeader(
              "Passo 3",
              "Dados financeiros.",
              "Ordens de grandeza bastam — a IA normaliza, identifica add-backs e marca lacunas."
            )}
            <div className="space-y-6">
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold flex items-center gap-1.5">
                  <LineChart className="h-3.5 w-3.5" /> Faturamento anual (R$)
                </Label>
                <Input className={inputStyle} value={faturamento} onChange={(e) => setFaturamento(e.target.value)} placeholder="12.000.000" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold flex items-center gap-1.5">
                  <LineChart className="h-3.5 w-3.5" /> EBITDA estimado (R$)
                </Label>
                <Input className={inputStyle} value={ebitda} onChange={(e) => setEbitda(e.target.value)} placeholder="1.800.000" />
              </div>
              <p className="text-xs text-white/40 break-words pt-2">
                Se não souber EBITDA, deixe em branco — a Mari estima a partir do setor e do porte.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3 — auto-avaliação OU paste */}
        {step === 3 && mode === "wizard" && (
          <div>
            {stepHeader(
              "Passo 4",
              "Auto-avaliação · 12 dimensões.",
              "Honestidade aqui = qualidade do diagnóstico. 0 = péssimo · 100 = excelente."
            )}
            <div className="space-y-6">
              {DIMENSOES.map((d) => (
                <div key={d.key} className="group">
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Label className="text-sm text-bone break-words">{d.label}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-white/30 hover:text-volt transition-colors">
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">{d.hint}</TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-volt font-mono text-sm tabular-nums shrink-0">{scores[d.key]}</span>
                  </div>
                  <Slider
                    value={[scores[d.key]]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(v) => setScores((s) => ({ ...s, [d.key]: v[0] }))}
                  />
                </div>
              ))}
              <div className="pt-2">
                <Label className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold">Observações livres (opcional)</Label>
                <Textarea
                  value={observ}
                  onChange={(e) => setObserv(e.target.value)}
                  placeholder="O que mais a Mari precisa saber sobre a empresa?"
                  className="mt-2 bg-transparent border border-white/15 rounded-lg focus-visible:ring-0 focus-visible:border-volt text-bone placeholder:text-white/30 min-h-[100px]"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && mode === "meeting_paste" && (
          <div>
            {stepHeader(
              "Passo 4",
              "Cole o diagnóstico da reunião.",
              "Transcrição, ata ou notas em texto livre. A Mari extrai os sinais."
            )}
            <Textarea
              value={meetingText}
              onChange={(e) => setMeetingText(e.target.value)}
              placeholder="Cole aqui a transcrição da reunião de diagnóstico…"
              className="bg-transparent border border-white/15 rounded-lg focus-visible:ring-0 focus-visible:border-volt text-bone placeholder:text-white/30 min-h-[340px]"
            />
          </div>
        )}

        {/* STEP 4 — Arquétipo (preview pra anônimo, real pra logado depois) */}
        {step === 4 && (
          <div>
            {stepHeader(
              "Passo 5",
              "Arquétipo do negócio.",
              "A Mari detecta o modelo econômico (serviço, projeto, recorrente) pra calibrar valuation e plano. A classificação final roda junto com o diagnóstico no próximo passo."
            )}

            <div className="space-y-4">
              {Object.entries(ARQUETIPOS_LABEL).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setChosenArquetipo(k)}
                  className={[
                    "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-3",
                    chosenArquetipo === k
                      ? "border-volt bg-volt/5"
                      : "border-white/10 bg-graphite/30 hover:border-white/25",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="h-4 w-4 text-volt shrink-0" />
                    <span className="font-medium text-bone break-words">{v}</span>
                  </div>
                  {chosenArquetipo === k && (
                    <Badge className="bg-volt text-carbon shrink-0">selecionado</Badge>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setChosenArquetipo("")}
                className={[
                  "w-full text-left p-4 rounded-xl border transition-all",
                  chosenArquetipo === ""
                    ? "border-volt bg-volt/5"
                    : "border-white/10 bg-graphite/30 hover:border-white/25",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <Wand2 className="h-4 w-4 text-volt shrink-0" />
                  <div>
                    <div className="font-medium text-bone">Deixar a Mari decidir</div>
                    <p className="text-xs text-white/50 mt-0.5 break-words">
                      A IA classifica e justifica com sinais do seu setor.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 — Gate (anônimo) ou confirmação (logado) */}
        {step === 5 && (
          <div>
            {stepHeader(
              "Último passo",
              user ? "Pronto pra gerar o seu diagnóstico." : "Seu plano está pronto pra ser desbloqueado.",
              user
                ? "A Mari vai rodar o classificador, calcular IPE + valuation e montar o plano em sprints. Leva até 30 segundos."
                : undefined
            )}

            {user ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-volt/20 bg-volt/5 p-5 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <ListChecks className="h-4 w-4 text-volt mt-0.5" />
                    <div className="flex-1 text-sm">
                      <div className="text-white/50 text-xs uppercase tracking-[0.2em] font-semibold mb-1">Resumo</div>
                      <div className="text-bone break-words">
                        <strong>{razao || cnpj || "Empresa"}</strong> · {ARQUETIPOS_LABEL[chosenArquetipo] || "arquétipo a definir pela IA"} ·{" "}
                        modo {mode === "wizard" ? "intake guiado" : "diagnóstico colado"}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-white/40 break-words">
                  Você poderá enriquecer com documentos depois (DRE, balanço, contratos) para refinar o valuation.
                </p>
              </div>
            ) : (
              <SignupGateCard />
            )}
          </div>
        )}

        {/* Docs upload — só pós-login e a partir do step 3 */}
        {user && (step === 3 || step === 4 || step === 5) && draftAssessmentId && (
          <div className="mt-8">
            <EquityDocsUpload assessmentId={draftAssessmentId} compact />
          </div>
        )}
      </WizardShell>
    </TooltipProvider>
  );
}
