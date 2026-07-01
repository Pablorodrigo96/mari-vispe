import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowRight, ArrowLeft, Sparkles, FileText, Loader2, Wand2, Rocket, Info, Building2,
  LineChart as LineChartIcon, ListChecks, Settings2, Users2, ShieldCheck, ClipboardPaste,
  ChevronDown, CheckCircle2, AlertCircle, Save, TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  DIMENSOES, DIMENSAO_GROUPS, PORTE_OPTIONS, ARQUETIPOS_LABEL,
  parseBrl, formatBrlInput,
} from "@/lib/equity-planner/constants";
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
const DRAFT_TTL_MS = 60 * 60 * 1000;

const STEPS = [
  { label: "Modo de entrada", sub: "Wizard guiado ou texto livre" },
  { label: "Identificação", sub: "Empresa, setor, porte" },
  { label: "Financeiro", sub: "Faturamento + EBITDA" },
  { label: "Auto-avaliação", sub: "12 dimensões de prontidão" },
  { label: "Arquétipo", sub: "Classificação IA" },
  { label: "Gerar diagnóstico", sub: "IPE, valuation e plano" },
];

const inputStyle =
  "bg-transparent border-0 border-b-2 border-white/15 rounded-none px-0 h-11 text-bone placeholder:text-white/30 focus-visible:ring-0 focus-visible:border-volt transition-colors text-base";

const GROUP_ICONS = {
  "line-chart": LineChartIcon,
  settings: Settings2,
  users: Users2,
  shield: ShieldCheck,
};

const ARQUETIPO_META: Record<string, { icon: any; desc: string }> = {
  servico_profissional: { icon: Users2, desc: "Consultoria, advocacia, engenharia — receita por hora/projeto, forte dependência do time." },
  projeto_obra: { icon: Building2, desc: "Obras, integrações, produção sob demanda — cada job é único." },
  projeto_obra_estruturado: { icon: Building2, desc: "Projetos com escopo/preço fechados, playbook replicável." },
  recorrente: { icon: TrendingUp, desc: "SaaS, assinatura, contrato mensal — MRR previsível, múltiplo mais alto." },
  produto_ip: { icon: Sparkles, desc: "Produto proprietário licenciável, patente, marca escalável." },
};

export default function EquityPlannerNew() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeRequested = searchParams.get("resume") === "1";

  const [step, setStep] = useState<Step>(0);
  const [mode, setMode] = useState<Mode>("wizard");
  const [loading, setLoading] = useState(false);
  const [computeStage, setComputeStage] = useState<"idle" | "classify" | "compute" | "done">("idle");
  const [classification, setClassification] = useState<Classification | null>(null);
  const [draftAssessmentId, setDraftAssessmentId] = useState<string | null>(null);
  const [chosenArquetipo, setChosenArquetipo] = useState<string>("");
  const [openGroup, setOpenGroup] = useState<string>(DIMENSAO_GROUPS[0].id);
  const [stepError, setStepError] = useState<string | null>(null);

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

  // ===== Live IPE preview =====
  const ipeLive = useMemo(() => {
    const vals = DIMENSOES.map((d) => scores[d.key] ?? 50);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [scores]);

  // ===== EBITDA margin badge =====
  const ebitdaMargin = useMemo(() => {
    const f = parseBrl(faturamento);
    const e = parseBrl(ebitda);
    if (f <= 0 || e <= 0) return null;
    return Math.round((e / f) * 100);
  }, [faturamento, ebitda]);

  const marginBadge = useMemo(() => {
    if (ebitdaMargin === null) return null;
    if (ebitdaMargin >= 20) return { tone: "good", label: `Margem ${ebitdaMargin}% · saudável` };
    if (ebitdaMargin >= 10) return { tone: "warn", label: `Margem ${ebitdaMargin}% · atenção` };
    if (ebitdaMargin >= 0) return { tone: "bad", label: `Margem ${ebitdaMargin}% · crítica` };
    return { tone: "bad", label: `Margem negativa · ${ebitdaMargin}%` };
  }, [ebitdaMargin]);

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
        if (error || data?.error) setMarketScanStatus("error");
        else setMarketScanStatus("done");
      } catch {
        setMarketScanStatus("error");
      }
    }, 1500);
    return () => {
      if (marketScanRef.current.timer) clearTimeout(marketScanRef.current.timer);
    };
  }, [razao, cnpj, user, draftAssessmentId, faturamento]);

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

  // ===== Hydrate =====
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

  // ===== Persist =====
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          data: { mode, razao, cnpj, setor, porte, uf, scores, faturamento, ebitda, observ, meetingText, chosenArquetipo, step },
        })
      );
    } catch (_) { }
  }, [mode, razao, cnpj, setor, porte, uf, scores, faturamento, ebitda, observ, meetingText, chosenArquetipo, step]);

  const buildIntakeText = (): string => {
    if (mode === "meeting_paste") return meetingText;
    const lines = [
      `Empresa: ${razao || "(não informado)"}`,
      `CNPJ: ${cnpj || "(não informado)"} · Setor: ${setor || "(não informado)"} · UF: ${uf || "—"} · Porte: ${porte}`,
      `Faturamento anual declarado: ${faturamento || "(não informado)"}`,
      `EBITDA declarado: ${ebitda || "(não informado)"}`,
      ebitdaMargin !== null ? `Margem EBITDA calculada: ${ebitdaMargin}%` : "",
      "",
      "Auto-avaliação do dono nas 12 dimensões (0=péssimo, 100=excelente):",
      ...DIMENSOES.map((d) => `- ${d.label}: ${scores[d.key]}`),
      "",
      "Observações livres do empresário:",
      observ || "(sem observações)",
    ].filter(Boolean);
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
        setTimeout(() => reject(new Error(`Tempo esgotado (${Math.round(timeoutMs / 1000)}s). Tente novamente.`)), timeoutMs),
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
    setComputeStage("classify");
    try {
      const id = await ensureDraft(user.id);
      const intakeText = buildIntakeText();

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
        console.warn("classify failed", clsFail);
        toast.message("Classificação automática indisponível — seguindo com arquétipo padrão.");
      }

      setComputeStage("compute");
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

      if (marketScanStatus === "running") {
        toast.info("Mapeamento de mercado ainda processando — aparecerá no diagnóstico em alguns segundos.");
      }

      setComputeStage("done");
      sessionStorage.removeItem(DRAFT_KEY);
      toast.success("Diagnóstico pronto ✨");
      navigate(`/equity-planner/${id}`);
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao gerar diagnóstico: " + (e?.message || "erro"));
      setComputeStage("idle");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRunRef.current) return;
    if (!hydratedRef.current || authLoading || !user || !resumeRequested || step < 3) return;
    autoRunRef.current = true;
    setTimeout(() => { void runClassifierAndCompute(); }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, resumeRequested, step]);

  // ===== Step validation =====
  const validateStep = (s: Step): string | null => {
    if (s === 0) return null;
    if (s === 1) {
      if (!razao.trim() && cnpj.replace(/\D/g, "").length < 14)
        return "Informe a razão social ou um CNPJ válido para avançar.";
      if (!setor.trim()) return "Descreva o setor da empresa (ex: consultoria, indústria...).";
      return null;
    }
    if (s === 2 && mode === "wizard") {
      if (!faturamento.trim()) return "Informe ao menos o faturamento anual.";
      return null;
    }
    if (s === 3 && mode === "meeting_paste") {
      if (meetingText.trim().length < 200) return "Cole ao menos 200 caracteres do diagnóstico.";
      return null;
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) { setStepError(err); toast.error(err); return; }
    setStepError(null);
    setStep((s) => Math.min(5, s + 1) as Step);
  };
  const goBack = () => { setStepError(null); setStep((s) => Math.max(0, s - 1) as Step); };

  const handleGenerateClick = () => {
    if (!user) return;
    void runClassifierAndCompute();
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) { toast.info("Clipboard vazio."); return; }
      setMeetingText(text.slice(0, 15000));
      toast.success("Texto colado.");
    } catch {
      toast.error("Não foi possível acessar o clipboard.");
    }
  };

  // ===== Render helpers =====
  const stepHeader = (eyebrow: string, title: string, subtitle?: string, extra?: React.ReactNode) => (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-volt">{eyebrow}</p>
        {extra}
      </div>
      <h1 className="text-3xl md:text-4xl font-bold tracking-[-0.02em] leading-[1.1] break-words">{title}</h1>
      {subtitle && <p className="text-white/70 mt-3 leading-relaxed break-words">{subtitle}</p>}
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="outline"
        className="bg-transparent border-white/15 text-bone hover:bg-white/5 hover:text-bone h-11 px-5 rounded-xl disabled:opacity-30"
        disabled={step === 0 || loading}
        onClick={goBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      <div className="flex items-center gap-2">
        {hydratedRef.current && (razao || cnpj || meetingText) && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-white/50">
            <Save className="h-3 w-3" /> rascunho salvo
          </span>
        )}
        {step < 5 && (
          <Button
            className="bg-volt hover:bg-volt-light text-carbon font-bold h-11 px-6 rounded-xl shadow-volt"
            onClick={goNext}
          >
            {step === 4 ? "Revisar e gerar" : "Próximo"} <ArrowRight className="ml-2 h-4 w-4" />
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
    </div>
  );

  // Loading overlay progressivo
  if (loading && (computeStage === "classify" || computeStage === "compute")) {
    const stages = [
      { key: "classify", label: "Classificando arquétipo", desc: "Cruzando setor, porte e sinais do intake." },
      { key: "compute", label: "Calculando IPE e valuation", desc: "Ponderando 12 dimensões, aplicando comps e piso de liquidez." },
      { key: "plan", label: "Montando plano em sprints", desc: "Priorizando iniciativas por impacto × esforço." },
    ];
    return (
      <div className="min-h-[100dvh] bg-carbon text-bone flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-volt/10 border border-volt/30 mb-4">
              <Sparkles className="h-6 w-6 text-volt animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Mari está preparando seu diagnóstico</h2>
            <p className="text-white/60 text-sm break-words">
              Leva até 30 segundos. Não recarregue a página.
            </p>
          </div>
          <ol className="space-y-3">
            {stages.map((s, i) => {
              const active =
                (s.key === "classify" && computeStage === "classify") ||
                (s.key === "compute" && computeStage === "compute") ||
                (s.key === "plan" && computeStage === "compute");
              const done =
                (s.key === "classify" && computeStage !== "classify") ||
                (s.key === "compute" && (computeStage as string) === "done");

              return (
                <li key={s.key} className={[
                  "flex items-start gap-3 rounded-xl border p-4 transition-all",
                  active ? "border-volt/40 bg-volt/5" : done ? "border-white/10 bg-graphite/30" : "border-white/5 bg-graphite/10 opacity-50",
                ].join(" ")}>
                  <div className={[
                    "h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-mono",
                    active ? "bg-volt text-carbon" : done ? "bg-volt/20 text-volt border border-volt/40" : "bg-white/5 text-white/40 border border-white/10",
                  ].join(" ")}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-bone">{s.label}</div>
                    <div className="text-xs text-white/60 mt-0.5 break-words">{s.desc}</div>
                  </div>
                </li>
              );
            })}
          </ol>
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

  // ===== Meeting paste counter =====
  const pasteLen = meetingText.length;
  const pasteTone =
    pasteLen === 0 ? "text-white/40"
    : pasteLen < 200 ? "text-rose-300"
    : pasteLen < 12000 ? "text-emerald-300"
    : "text-amber-300";

  return (
    <TooltipProvider delayDuration={150}>
      <WizardShell step={step} steps={STEPS} stepKey={step} footer={footer} statusChip={statusChip}>

        {/* ============ STEP 0 ============ */}
        {step === 0 && (
          <div>
            {stepHeader(
              "Passo 1 · Modo",
              "Como vamos entrar com os dados?",
              "Você pode responder uma auto-avaliação guiada ou colar o diagnóstico de uma reunião com o time Mari."
            )}

            <div className="grid gap-3">
              {[
                { key: "wizard" as Mode, icon: Sparkles, title: "Intake guiado", desc: "Auto-avaliação nas 12 dimensões, agrupadas em 4 blocos. Cerca de 5 minutos.", eta: "~5 min" },
                { key: "meeting_paste" as Mode, icon: FileText, title: "Colar diagnóstico de reunião", desc: "Cole a transcrição ou ata. A IA extrai os sinais e preenche o modelo.", eta: "~1 min" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setMode(opt.key)}
                  className={[
                    "text-left p-5 rounded-xl border transition-all",
                    mode === opt.key
                      ? "border-volt bg-volt/5 shadow-[0_0_32px_-12px_hsl(72_86%_68%/0.5)]"
                      : "border-white/10 bg-graphite/30 hover:border-white/25 hover:bg-graphite/50",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-volt/10 border border-volt/20 flex items-center justify-center text-volt shrink-0">
                      <opt.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-bone">{opt.title}</span>
                        <Badge variant="outline" className="border-white/15 text-white/60 text-[10px] px-2 py-0">{opt.eta}</Badge>
                      </div>
                      <p className="text-sm text-white/65 mt-1 break-words">{opt.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============ STEP 1 ============ */}
        {step === 1 && (
          <div>
            {stepHeader(
              "Passo 2 · Empresa",
              "Identifique a empresa.",
              "Use o nome real. Tudo segue sob NDA implícito e fica anonimizado no marketplace."
            )}
            <div className="space-y-6">
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Razão social</Label>
                <Input className={inputStyle} value={razao} onChange={(e) => setRazao(e.target.value)} placeholder="ACME Indústria Ltda" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-5">
                <div>
                  <Label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">CNPJ</Label>
                  <Input className={inputStyle} value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">UF</Label>
                  <Input className={inputStyle} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" />
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Setor</Label>
                <Input className={inputStyle} value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Provedor de internet, consultoria de TI, indústria..." />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Porte</Label>
                <select
                  className="mt-2 w-full bg-transparent border-0 border-b-2 border-white/15 focus:border-volt outline-none h-11 text-bone text-base appearance-none"
                  value={porte}
                  onChange={(e) => setPorte(e.target.value)}
                >
                  {PORTE_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value} className="bg-carbon">{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {stepError && (
              <div className="mt-6 flex items-start gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {stepError}
              </div>
            )}
          </div>
        )}

        {/* ============ STEP 2 ============ */}
        {step === 2 && (
          <div>
            {stepHeader(
              "Passo 3 · Financeiro",
              "Faturamento e EBITDA.",
              "Ordens de grandeza bastam — a Mari normaliza, identifica add-backs e sinaliza lacunas.",
              marginBadge && (
                <Badge className={[
                  "text-[10px]",
                  marginBadge.tone === "good" && "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
                  marginBadge.tone === "warn" && "bg-amber-500/15 text-amber-300 border-amber-500/30",
                  marginBadge.tone === "bad" && "bg-rose-500/15 text-rose-300 border-rose-500/30",
                ].filter(Boolean).join(" ")}>
                  {marginBadge.label}
                </Badge>
              )
            )}
            <div className="space-y-6">
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold flex items-center gap-1.5">
                  <LineChartIcon className="h-3.5 w-3.5" /> Faturamento anual (R$)
                </Label>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/40 text-lg pt-2">R$</span>
                  <Input
                    className={inputStyle}
                    value={faturamento}
                    onChange={(e) => setFaturamento(formatBrlInput(e.target.value))}
                    placeholder="12.000.000"
                    inputMode="numeric"
                  />
                </div>
                {parseBrl(faturamento) > 0 && (
                  <p className="text-[11px] text-white/50 mt-1.5">
                    ≈ {parseBrl(faturamento) >= 1_000_000
                      ? `${(parseBrl(faturamento) / 1_000_000).toFixed(1).replace(".", ",")} milhões`
                      : `${(parseBrl(faturamento) / 1_000).toFixed(0)} mil`}/ano
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold flex items-center gap-1.5">
                  <LineChartIcon className="h-3.5 w-3.5" /> EBITDA estimado (R$)
                </Label>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/40 text-lg pt-2">R$</span>
                  <Input
                    className={inputStyle}
                    value={ebitda}
                    onChange={(e) => setEbitda(formatBrlInput(e.target.value))}
                    placeholder="1.800.000"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <p className="text-xs text-white/55 break-words pt-2 border-t border-white/5">
                💡 Não sabe o EBITDA? Deixe em branco — a Mari estima a partir do setor e do porte informados.
              </p>
            </div>
            {stepError && (
              <div className="mt-6 flex items-start gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {stepError}
              </div>
            )}
          </div>
        )}

        {/* ============ STEP 3 — WIZARD (accordion + IPE live) ============ */}
        {step === 3 && mode === "wizard" && (
          <div>
            {stepHeader(
              "Passo 4 · Auto-avaliação",
              "12 dimensões de prontidão.",
              "Honestidade aqui = qualidade do diagnóstico. Agrupamos em 4 blocos pra ficar rápido.",
              <Badge className="bg-volt/10 text-volt border-volt/30">
                IPE parcial: <span className="ml-1.5 font-mono font-bold">{ipeLive}</span>
              </Badge>
            )}

            {/* Barra IPE live */}
            <div className="mb-6">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-volt/60 to-volt rounded-full transition-all duration-500"
                  style={{ width: `${ipeLive}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-white/40 mt-1.5 font-mono">
                <span>0</span><span>50</span><span>100</span>
              </div>
            </div>

            <div className="space-y-3">
              {DIMENSAO_GROUPS.map((g) => {
                const GroupIcon = GROUP_ICONS[g.icon];
                const isOpen = openGroup === g.id;
                const groupVals = g.keys.map((k) => scores[k] ?? 50);
                const groupAvg = Math.round(groupVals.reduce((a, b) => a + b, 0) / groupVals.length);
                return (
                  <div key={g.id} className={[
                    "rounded-xl border transition-all",
                    isOpen ? "border-volt/30 bg-graphite/40" : "border-white/10 bg-graphite/20 hover:border-white/20",
                  ].join(" ")}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 p-4 text-left"
                      onClick={() => setOpenGroup(isOpen ? "" : g.id)}
                    >
                      <div className="h-9 w-9 rounded-lg bg-volt/10 border border-volt/20 flex items-center justify-center text-volt shrink-0">
                        <GroupIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-bone">{g.label}</div>
                        <div className="text-[11px] text-white/50 mt-0.5">{g.keys.length} dimensões</div>
                      </div>
                      <span className="text-volt font-mono text-sm tabular-nums shrink-0">{groupAvg}</span>
                      <ChevronDown className={["h-4 w-4 text-white/40 transition-transform shrink-0", isOpen && "rotate-180"].filter(Boolean).join(" ")} />
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-5 pt-1 space-y-5 border-t border-white/5">
                        {g.keys.map((key) => {
                          const d = DIMENSOES.find((x) => x.key === key)!;
                          return (
                            <div key={key}>
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
                                <span className="text-volt font-mono text-sm tabular-nums shrink-0">{scores[key]}</span>
                              </div>
                              <Slider
                                value={[scores[key]]}
                                min={0}
                                max={100}
                                step={5}
                                onValueChange={(v) => setScores((s) => ({ ...s, [key]: v[0] }))}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-6">
              <Label className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Observações livres (opcional)</Label>
              <Textarea
                value={observ}
                onChange={(e) => setObserv(e.target.value)}
                placeholder="O que mais a Mari precisa saber sobre a empresa?"
                className="mt-2 bg-transparent border border-white/15 rounded-lg focus-visible:ring-0 focus-visible:border-volt text-bone placeholder:text-white/30 min-h-[100px]"
              />
            </div>
          </div>
        )}

        {/* ============ STEP 3 — PASTE ============ */}
        {step === 3 && mode === "meeting_paste" && (
          <div>
            {stepHeader(
              "Passo 4 · Diagnóstico",
              "Cole o diagnóstico da reunião.",
              "Transcrição, ata ou notas em texto livre. A Mari extrai os sinais.",
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePasteClipboard}
                className="bg-transparent border-volt/30 text-volt hover:bg-volt/10 hover:text-volt h-8 px-3 rounded-lg text-xs"
              >
                <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" /> Colar
              </Button>
            )}
            <Textarea
              value={meetingText}
              onChange={(e) => setMeetingText(e.target.value.slice(0, 15000))}
              maxLength={15000}
              placeholder={`Exemplo:\n\nReunião com Fernando, sócio da ACME. Faturam ~R$ 12mi/ano com margem ~15%. 3 clientes concentram 60% da receita. Dono está no dia a dia comercial. Contabilidade unificada com PJ do sócio. Contratos com 2 clientes vencendo em 6m...`}
              className="bg-transparent border border-white/15 rounded-lg focus-visible:ring-0 focus-visible:border-volt text-bone placeholder:text-white/25 min-h-[340px] text-sm leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2 text-[11px] font-mono">
              <span className={pasteTone}>
                {pasteLen === 0 && "Cole o texto acima ou use o botão Colar"}
                {pasteLen > 0 && pasteLen < 200 && `Muito curto — precisa 200+ caracteres (${pasteLen})`}
                {pasteLen >= 200 && pasteLen < 12000 && `✓ Pronto pra analisar`}
                {pasteLen >= 12000 && `Perto do limite — considere resumir`}
              </span>
              <span className="text-white/40">{pasteLen.toLocaleString("pt-BR")} / 15.000</span>
            </div>
            {stepError && (
              <div className="mt-4 flex items-start gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {stepError}
              </div>
            )}
          </div>
        )}

        {/* ============ STEP 4 — Arquétipo ============ */}
        {step === 4 && (
          <div>
            {stepHeader(
              "Passo 5 · Arquétipo",
              "Modelo econômico do negócio.",
              "A Mari detecta o arquétipo pra calibrar valuation e plano. Você pode escolher ou deixar a IA decidir."
            )}

            <div className="space-y-3">
              {Object.entries(ARQUETIPOS_LABEL).map(([k, v]) => {
                const meta = ARQUETIPO_META[k] || { icon: Building2, desc: "" };
                const Icon = meta.icon;
                const selected = chosenArquetipo === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setChosenArquetipo(k)}
                    className={[
                      "w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3",
                      selected
                        ? "border-volt bg-volt/5 shadow-[0_0_24px_-12px_hsl(72_86%_68%/0.4)]"
                        : "border-white/10 bg-graphite/30 hover:border-white/25",
                    ].join(" ")}
                  >
                    <div className={[
                      "h-10 w-10 rounded-lg border flex items-center justify-center shrink-0",
                      selected ? "bg-volt/15 border-volt/40 text-volt" : "bg-white/5 border-white/10 text-white/60",
                    ].join(" ")}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-bone break-words">{v}</span>
                        {selected && <Badge className="bg-volt text-carbon shrink-0 text-[10px]">selecionado</Badge>}
                      </div>
                      {meta.desc && <p className="text-xs text-white/60 mt-1 break-words">{meta.desc}</p>}
                    </div>
                  </button>
                );
              })}
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
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-volt/10 border border-volt/20 flex items-center justify-center text-volt shrink-0">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-bone">Deixar a Mari decidir</span>
                      <Badge className="bg-volt/10 text-volt border-volt/30 text-[10px]">recomendado</Badge>
                    </div>
                    <p className="text-xs text-white/60 mt-1 break-words">
                      A IA classifica com base nos sinais do seu setor e explica o porquê.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP 5 — Gate/confirmação ============ */}
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
                    <div className="flex-1 text-sm space-y-2">
                      <div>
                        <div className="text-white/50 text-[10px] uppercase tracking-[0.2em] font-semibold mb-1">Empresa</div>
                        <div className="text-bone break-words">{razao || cnpj || "—"} · {setor || "setor a definir"} · {uf || "—"}</div>
                      </div>
                      <div>
                        <div className="text-white/50 text-[10px] uppercase tracking-[0.2em] font-semibold mb-1">Arquétipo</div>
                        <div className="text-bone">{ARQUETIPOS_LABEL[chosenArquetipo] || "a definir pela IA"}</div>
                      </div>
                      {mode === "wizard" && (
                        <div>
                          <div className="text-white/50 text-[10px] uppercase tracking-[0.2em] font-semibold mb-1">IPE parcial (auto-avaliação)</div>
                          <div className="text-bone font-mono">{ipeLive} / 100</div>
                        </div>
                      )}
                      {marginBadge && (
                        <div>
                          <div className="text-white/50 text-[10px] uppercase tracking-[0.2em] font-semibold mb-1">Margem EBITDA</div>
                          <div className="text-bone">{marginBadge.label}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-white/55 break-words">
                  Depois você poderá enriquecer com documentos (DRE, balanço, contratos) para refinar o valuation.
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
