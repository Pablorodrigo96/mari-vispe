import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, ArrowLeft, TrendingUp, TrendingDown, Minus, Users, Activity, Target, LineChart as LineIcon, AlertTriangle, FileText, PlusCircle, Mail, Crosshair, Copy, MessageCircle, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import { DIMENSOES, ARQUETIPOS_LABEL, VEREDITO_LABEL, brl } from "@/lib/equity-planner/constants";
import EquityDocsUpload from "@/components/equity-planner/EquityDocsUpload";

interface Assessment {
  id: string; ipe_composto: number | null; arquetipo_id: string | null;
  veredito_liquidez: string | null; summary: string | null; status: string;
  company_id: string; confianca_arquetipo: number | null;
  migracao_arquetipo_sugerida: any | null;
  archetype_classification: any | null;
}
interface DimScore { dimensao: string; score: number; peso: number; destruidor_top: boolean; evidencias: any; }
interface Valuation { id: string; ebitda_contabil: number | null; ebitda_normalizado: number; addbacks: any; multiplo_aplicado: number; faixa_min: number; faixa_max: number; valor_atual: number; valor_alvo: number; valor_dcf: number | null; valor_sde: number | null; valor_triangulado: number | null; dcf_premissas: any; }
interface Bridge { parcela: string; descricao: string; delta_valor: number; ordem: number; }
interface Initiative { id: string; titulo: string; descricao: string | null; dimensao_alvo: string; delta_ipe: number; delta_valor: number; esforco: string; prazo_meses: number; sprint: number; status: string; tipo: string; prioridade: number; }
interface Buyer { id: string; arquetipo_comprador: string; nome_alvo: string | null; setor_alvo: string | null; tese_aquisicao: string | null; racional_premio: string | null; sinergias: string[] | null; exemplos_targets: string[] | null; premio_estimado_pct: number; premio_estimado_valor: number; selecionado: boolean; carta_convite: string | null; }
interface Progresso { id: string; assessment_id: string | null; ipe: number; valor: number; valor_alvo: number | null; created_at: string; evento: string; dim_snapshot: Record<string, number> | null; top_destruidores: any[] | null; arquetipo_id: string | null; veredito_liquidez: string | null; }

export default function EquityPlannerAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [creatingRound, setCreatingRound] = useState(false);
  const [assess, setAssess] = useState<Assessment | null>(null);
  const [dims, setDims] = useState<DimScore[]>([]);
  const [val, setVal] = useState<Valuation | null>(null);
  const [bridge, setBridge] = useState<Bridge[]>([]);
  const [inits, setInits] = useState<Initiative[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [progresso, setProgresso] = useState<Progresso[]>([]);
  const [letterOpen, setLetterOpen] = useState(false);
  const [letterBuyer, setLetterBuyer] = useState<Buyer | null>(null);
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterText, setLetterText] = useState<string>("");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: a } = await supabase.from("equity_assessments").select("*").eq("id", id).single();
    if (!a) { setLoading(false); return; }
    setAssess(a as any);
    const [d, v, ini, bm, pl] = await Promise.all([
      supabase.from("equity_dimension_scores").select("*").eq("assessment_id", id),
      supabase.from("equity_valuations").select("*").eq("assessment_id", id).maybeSingle(),
      supabase.from("equity_initiatives").select("*").eq("assessment_id", id).order("prioridade"),
      supabase.from("equity_buyer_map").select("*").eq("assessment_id", id).order("prioridade"),
      supabase.from("equity_progress_log").select("*").eq("company_id", (a as any).company_id).order("created_at", { ascending: true }),
    ]);
    setDims((d.data as any) || []);
    setVal((v.data as any) || null);
    setInits((ini.data as any) || []);
    setBuyers((bm.data as any) || []);
    setProgresso((pl.data as any) || []);
    if (v.data) {
      const { data: br } = await supabase.from("equity_value_bridge_items").select("*").eq("valuation_id", (v.data as any).id).order("ordem");
      setBridge((br as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleRecompute = async () => {
    if (!assess) return;
    setRecomputing(true);
    try {
      const intake = (assess as any).raw_intake?.meetingText
        || JSON.stringify((assess as any).raw_intake || {});
      const { error } = await supabase.functions.invoke("equity-planner-compute", {
        body: { assessmentId: assess.id, intakeText: intake, companyData: (assess as any).raw_intake || {} },
      });
      if (error) throw error;
      toast.success("Re-medição concluída");
      await load();
    } catch (e: any) {
      toast.error("Falha ao re-medir: " + e.message);
    } finally { setRecomputing(false); }
  };

  const handleNewRound = async () => {
    if (!assess || !user) return;
    setCreatingRound(true);
    try {
      const rodadaAtual = Number((assess as any).rodada) || 1;
      const { data: novo, error: insErr } = await supabase
        .from("equity_assessments")
        .insert({
          user_id: user.id,
          company_id: assess.company_id,
          arquetipo_id: assess.arquetipo_id,
          raw_intake: (assess as any).raw_intake || {},
          source: "re-medicao",
          status: "draft",
          parent_assessment_id: assess.id,
          rodada: rodadaAtual + 1,
        } as any)
        .select("id")
        .single();
      if (insErr) throw insErr;
      const intake = (assess as any).raw_intake?.meetingText
        || JSON.stringify((assess as any).raw_intake || {});
      const { error } = await supabase.functions.invoke("equity-planner-compute", {
        body: { assessmentId: (novo as any).id, intakeText: intake, companyData: (assess as any).raw_intake || {} },
      });
      if (error) throw error;
      toast.success(`Rodada ${rodadaAtual + 1} criada`);
      navigate(`/equity-planner/${(novo as any).id}`);
    } catch (e: any) {
      toast.error("Falha ao criar rodada: " + e.message);
    } finally { setCreatingRound(false); }
  };

  // Onda 5 — Buyer reverso
  const buyerSelecionado = buyers.find((b) => b.selecionado) || null;

  const handleSelectBuyer = async (buyer: Buyer) => {
    if (!assess) return;
    const newState = !buyer.selecionado;
    try {
      // mutually exclusive: limpa todos e marca o escolhido
      await supabase.from("equity_buyer_map").update({ selecionado: false }).eq("assessment_id", assess.id);
      if (newState) {
        await supabase.from("equity_buyer_map").update({ selecionado: true }).eq("id", buyer.id);
      }
      setBuyers((bs) => bs.map((b) => ({ ...b, selecionado: b.id === buyer.id ? newState : false })));
      toast.success(newState ? "Comprador-alvo definido — plano reordenado" : "Comprador-alvo removido");
    } catch (e: any) {
      toast.error("Falha: " + e.message);
    }
  };

  const handleGenerateLetter = async (buyer: Buyer) => {
    if (!assess) return;
    setLetterBuyer(buyer);
    setLetterText(buyer.carta_convite || "");
    setLetterOpen(true);
    if (buyer.carta_convite) return;
    setLetterLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("equity-planner-buyer-letter", {
        body: { assessmentId: assess.id, buyerId: buyer.id },
      });
      if (error) throw error;
      setLetterText((data as any)?.carta || "");
      setBuyers((bs) => bs.map((b) => b.id === buyer.id ? { ...b, carta_convite: (data as any)?.carta } : b));
    } catch (e: any) {
      toast.error("Falha ao gerar carta: " + e.message);
    } finally { setLetterLoading(false); }
  };

  const copyLetter = async () => {
    try { await navigator.clipboard.writeText(letterText); toast.success("Carta copiada"); }
    catch { toast.error("Não foi possível copiar"); }
  };

  const openWhatsApp = () => {
    const text = encodeURIComponent(letterText);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Mapeia sinergias do comprador para dimensões prioritárias (engenharia reversa do plano)
  const SINERGIA_DIM_KEYWORDS: Array<{ dim: string; kw: RegExp }> = [
    { dim: "qualidade_receita", kw: /recorr|contrato|mrr|arr|assinatura|retenc|churn/i },
    { dim: "motor_comercial", kw: /cross[- ]sell|upsell|funil|pipeline|comercial|vendas|canal/i },
    { dim: "margem", kw: /margem|custo|sinergia operacional|escala|consolida|back[- ]office/i },
    { dim: "independencia_dono", kw: /dono|liderança|sucess|gestor|substitu/i },
    { dim: "gestao", kw: /gest(ão|ao)|liderança|c-?level|segundo nível/i },
    { dim: "higiene_financeira", kw: /contábil|cont(á|a)bil|auditável|earn[- ]out|due dilig|reporting/i },
    { dim: "contingencias", kw: /passivo|trabalhista|fiscal|contingência|process/i },
    { dim: "concentracao", kw: /concentra|diversifica|carteira|cliente top|whitespace/i },
    { dim: "narrativa", kw: /tese|tam|narrativa|crescimento|expansão|geografia|nova praça/i },
    { dim: "atratividade", kw: /estratég|prêmio|sinergia estratég|posicionamento|marca/i },
    { dim: "societario", kw: /societár|cap table|quotas|acordo de sócio|ip/i },
    { dim: "processos", kw: /sop|processo|sistema|erp|integração/i },
  ];

  const dimsBoostByBuyer = (buyer: Buyer | null): Set<string> => {
    const out = new Set<string>();
    if (!buyer) return out;
    const blob = [buyer.tese_aquisicao || "", buyer.racional_premio || "", ...(buyer.sinergias || [])].join(" ").toLowerCase();
    SINERGIA_DIM_KEYWORDS.forEach((m) => { if (m.kw.test(blob)) out.add(m.dim); });
    return out;
  };
  const dimsBoost = dimsBoostByBuyer(buyerSelecionado);

  const initsReordered = useMemo(() => {
    if (!buyerSelecionado || dimsBoost.size === 0) return inits;
    return [...inits].sort((a, b) => {
      const ab = dimsBoost.has(a.dimensao_alvo) ? 0 : 1;
      const bb = dimsBoost.has(b.dimensao_alvo) ? 0 : 1;
      if (ab !== bb) return ab - bb;
      return (a.prioridade || 0) - (b.prioridade || 0);
    });
  }, [inits, buyerSelecionado, dimsBoost]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-volt" /></div>;
  if (!assess) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Diagnóstico não encontrado.</div>;

  const radarData = DIMENSOES.map((d) => ({
    dim: d.label.split(" ")[0],
    score: dims.find((x) => x.dimensao === d.key)?.score ?? 0,
  }));
  const topDestruidores = dims.filter((d) => d.destruidor_top).sort((a, b) => a.score - b.score);
  const veredito = VEREDITO_LABEL[assess.veredito_liquidez || "vendavel_em_meses"];
  const piso = 45;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <Link to="/meus-equity-planners" className="text-sm text-muted-foreground hover:text-volt inline-flex items-center gap-1 mb-2">
              <ArrowLeft className="h-3 w-3" /> Meus diagnósticos
            </Link>
            <h1 className="text-3xl font-bold break-words">Raio-X de Equity</h1>
            <div className="flex gap-2 mt-2 flex-wrap">
              {assess.arquetipo_id && (
                <Badge className="bg-volt/10 text-volt border-volt/30">
                  {ARQUETIPOS_LABEL[assess.arquetipo_id] || assess.arquetipo_id}
                </Badge>
              )}
              <Badge variant="outline" className={
                veredito?.tone === "good" ? "border-emerald-500/40 text-emerald-400" :
                veredito?.tone === "warn" ? "border-amber-500/40 text-amber-400" :
                "border-rose-500/40 text-rose-400"
              }>
                {veredito?.label || "—"}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="bg-transparent" disabled={recomputing} onClick={handleRecompute}>
              {recomputing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Re-medir
            </Button>
            <Button className="bg-volt text-carbon hover:bg-volt/90" disabled={creatingRound} onClick={handleNewRound}>
              {creatingRound ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />}
              Nova rodada
            </Button>
          </div>
        </div>

        {/* IPE Hero */}
        <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/20 p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Índice de Prontidão (IPE)</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-5xl font-bold text-volt">{assess.ipe_composto ?? "—"}</span>
                <span className="text-muted-foreground">/100</span>
              </div>
              <Progress value={assess.ipe_composto || 0} className="mt-3 h-2" />
              <p className="text-xs text-muted-foreground mt-2">Piso de liquidez: {piso}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Valor atual</p>
              <div className="text-3xl font-bold mt-1">{brl(val?.valor_atual)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                EBITDA {brl(val?.ebitda_normalizado)} × {val?.multiplo_aplicado ?? "—"}x
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Valor potencial</p>
              <div className="text-3xl font-bold mt-1 text-volt">{brl(val?.valor_alvo)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Δ {brl((val?.valor_alvo || 0) - (val?.valor_atual || 0))} via execução do plano
              </p>
            </div>
          </div>

          {/* Faixa de múltiplo visual */}
          {val && (
            <div className="mt-6 pt-5 border-t border-volt/10">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs uppercase text-muted-foreground tracking-wider">Posição na faixa de múltiplo do arquétipo</p>
                <p className="text-xs text-muted-foreground">
                  {val.faixa_min}x — <span className="text-volt font-bold">{val.multiplo_aplicado}x hoje</span> — {val.faixa_max}x
                </p>
              </div>
              <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-rose-500/40 via-amber-500/40 to-emerald-500/60"
                  style={{ width: "100%" }}
                />
                <div
                  className="absolute top-0 h-full w-1 bg-volt shadow-[0_0_8px_#D9F564]"
                  style={{
                    left: `${Math.max(0, Math.min(100, ((val.multiplo_aplicado - val.faixa_min) / Math.max(0.01, (val.faixa_max - val.faixa_min))) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>zona invendável</span>
                <span>vendável com desconto</span>
                <span>topo da faixa + prêmio estratégico</span>
              </div>
            </div>
          )}

          {assess.summary && (
            <p className="mt-5 text-muted-foreground break-words border-l-2 border-volt pl-4">{assess.summary}</p>
          )}
        </Card>

        <Tabs defaultValue="raiox" className="w-full">
          <TabsList className="bg-slate-900/60 backdrop-blur">
            <TabsTrigger value="raiox"><Activity className="h-4 w-4 mr-1" /> Raio-X</TabsTrigger>
            <TabsTrigger value="valor"><TrendingUp className="h-4 w-4 mr-1" /> Valor</TabsTrigger>
            <TabsTrigger value="plano"><Target className="h-4 w-4 mr-1" /> Plano</TabsTrigger>
            <TabsTrigger value="compradores"><Users className="h-4 w-4 mr-1" /> Compradores</TabsTrigger>
            <TabsTrigger value="docs"><FileText className="h-4 w-4 mr-1" /> Docs</TabsTrigger>
            <TabsTrigger value="progresso"><LineIcon className="h-4 w-4 mr-1" /> Progresso</TabsTrigger>
          </TabsList>

          {/* RAIO-X */}
          <TabsContent value="raiox" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5">
                <h3 className="font-semibold mb-3">12 dimensões de prontidão</h3>
                <ResponsiveContainer width="100%" height={360}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#444" />
                    <PolarAngleAxis dataKey="dim" tick={{ fill: "#aaa", fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#666", fontSize: 9 }} />
                    <Radar name="Score" dataKey="score" stroke="#D9F564" fill="#D9F564" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="!bg-slate-900/60 backdrop-blur-md border-rose-500/20 p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" /> Top destruidores de valor
                </h3>
                <ul className="space-y-3">
                  {topDestruidores.map((d) => {
                    const meta = DIMENSOES.find((x) => x.key === d.dimensao);
                    return (
                      <li key={d.dimensao} className="border-l-2 border-rose-500/60 pl-3">
                        <div className="flex justify-between">
                          <span className="font-medium text-sm break-words">{meta?.label}</span>
                          <span className="text-rose-400 font-mono text-sm">{d.score}/100</span>
                        </div>
                        {d.evidencias?.[0]?.texto && (
                          <p className="text-xs text-muted-foreground mt-1 break-words">{d.evidencias[0].texto}</p>
                        )}
                      </li>
                    );
                  })}
                  {topDestruidores.length === 0 && <p className="text-sm text-muted-foreground">Nenhum destruidor crítico identificado.</p>}
                </ul>
              </Card>
            </div>
          </TabsContent>

          {/* VALOR */}
          <TabsContent value="valor" className="mt-4 space-y-4">
            {/* Triangulação de métodos */}
            {val && (val.valor_dcf || val.valor_sde) && (
              <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/20 p-5">
                <h3 className="font-semibold mb-3">Triangulação de valor — sanity check</h3>
                <div className="grid md:grid-cols-4 gap-3">
                  <div className="p-3 rounded border border-volt/30 bg-volt/5">
                    <p className="text-xs uppercase text-muted-foreground">Múltiplos (âncora)</p>
                    <p className="text-xl font-bold text-volt mt-1">{brl(val.valor_atual)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">EBITDA × {val.multiplo_aplicado}x</p>
                  </div>
                  {!!val.valor_dcf && (
                    <div className="p-3 rounded border border-volt/10 bg-slate-950/40">
                      <p className="text-xs uppercase text-muted-foreground">DCF (5 anos + perpetuidade)</p>
                      <p className="text-xl font-bold mt-1">{brl(val.valor_dcf)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        WACC {(val.dcf_premissas?.wacc*100).toFixed(0)}% · CAGR {(val.dcf_premissas?.cagr_5y*100).toFixed(0)}% · g {(val.dcf_premissas?.perpetuidade_g*100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                  {!!val.valor_sde && (
                    <div className="p-3 rounded border border-volt/10 bg-slate-950/40">
                      <p className="text-xs uppercase text-muted-foreground">SDE (dono-operador)</p>
                      <p className="text-xl font-bold mt-1">{brl(val.valor_sde)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">EBITDA + pró-labore × múltiplo de micro</p>
                    </div>
                  )}
                  {!!val.valor_triangulado && (
                    <div className="p-3 rounded border border-emerald-500/30 bg-emerald-500/5">
                      <p className="text-xs uppercase text-muted-foreground">Triangulado</p>
                      <p className="text-xl font-bold text-emerald-400 mt-1">{brl(val.valor_triangulado)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Mix ponderado dos métodos</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Normalização EBITDA */}
            {val && val.addbacks && Object.keys(val.addbacks || {}).length > 0 && (
              <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5">
                <h3 className="font-semibold mb-3">Normalização do EBITDA — addbacks identificados</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-volt/10">
                          <td className="py-2 text-muted-foreground">EBITDA contábil</td>
                          <td className="py-2 text-right font-mono">{brl(val.ebitda_contabil)}</td>
                        </tr>
                        {Object.entries(val.addbacks).filter(([_,v]) => Number(v) > 0).map(([k, v]) => (
                          <tr key={k} className="border-b border-volt/5">
                            <td className="py-2 text-xs text-muted-foreground">+ {k.replace(/_/g, " ")}</td>
                            <td className="py-2 text-right font-mono text-volt">{brl(Number(v))}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-volt/30">
                          <td className="py-2 font-semibold">EBITDA normalizado</td>
                          <td className="py-2 text-right font-mono font-bold text-volt">{brl(val.ebitda_normalizado)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p><strong className="text-volt">Por que normalizar?</strong> Compradores aplicam o múltiplo sobre o EBITDA "limpo" — descontando custos pessoais do dono, gastos não-recorrentes e remunerações fora do mercado.</p>
                    <p>Cada R$ de addback bem-documentado vale múltiplo × R$ de preço de venda. Documente em planilha auditável com lastro.</p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5">
              <h3 className="font-semibold mb-3">Value Bridge — valor hoje → valor potencial</h3>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={bridge.map(b => ({ name: b.parcela.replace("_", " "), valor: b.delta_valor, desc: b.descricao }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" tick={{ fill: "#aaa", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#aaa", fontSize: 11 }} tickFormatter={(v) => brl(v)} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a1a", border: "1px solid #D9F564" }}
                    formatter={(v: any) => brl(v as number)}
                  />
                  <Bar dataKey="valor" fill="#D9F564" />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid md:grid-cols-3 gap-3 mt-5">
                {bridge.map((b) => (
                  <div key={b.parcela} className="p-3 rounded border border-volt/10 bg-slate-950/40">
                    <p className="text-xs uppercase text-muted-foreground">{b.parcela.replace(/_/g," ")}</p>
                    <p className="text-lg font-bold text-volt mt-1">{brl(b.delta_valor)}</p>
                    <p className="text-xs text-muted-foreground mt-1 break-words">{b.descricao}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* PLANO */}
          <TabsContent value="plano" className="mt-4">
            {assess.migracao_arquetipo_sugerida?.para_arquetipo_id && (
              <Card className="!bg-gradient-to-br from-volt/10 to-volt/5 backdrop-blur-md border-volt/50 p-5 mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">🚀</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold">Migração de Arquétipo — alavanca de maior valor</h3>
                      <Badge className="bg-volt text-carbon">
                        {ARQUETIPOS_LABEL[assess.arquetipo_id || ""] || assess.arquetipo_id} → {ARQUETIPOS_LABEL[assess.migracao_arquetipo_sugerida.para_arquetipo_id] || assess.migracao_arquetipo_sugerida.para_arquetipo_id}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground break-words">
                      {assess.migracao_arquetipo_sugerida.racional}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Viabilidade: <span className="text-volt font-medium">{assess.migracao_arquetipo_sugerida.viabilidade}</span>
                    </p>
                  </div>
                </div>
              </Card>
            )}
            {buyerSelecionado && (
              <Card className="!bg-gradient-to-r from-volt/15 to-volt/5 backdrop-blur-md border-volt/50 p-4 mb-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <Crosshair className="h-5 w-5 text-volt mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold break-words">
                      Plano em engenharia reversa para: <span className="text-volt">{buyerSelecionado.nome_alvo || buyerSelecionado.arquetipo_comprador}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 break-words">
                      Iniciativas que destravam sinergias deste comprador foram priorizadas no topo.
                      {dimsBoost.size > 0 && (
                        <> Dimensões em foco: {Array.from(dimsBoost).map((d) => DIMENSOES.find((x) => x.key === d)?.label || d).join(" · ")}.</>
                      )}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="bg-transparent" onClick={() => handleSelectBuyer(buyerSelecionado)}>Limpar alvo</Button>
                </div>
              </Card>
            )}
            <div className="grid md:grid-cols-4 gap-3">
              {[1,2,3,4].map((sp) => {
                const sprintInits = initsReordered.filter((i) => i.sprint === sp);
                return (
                <Card key={sp} className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-4">
                  <h4 className="font-semibold mb-3 flex items-center justify-between">
                    <span>Sprint {sp}</span>
                    <span className="text-xs text-muted-foreground">Q{sp}</span>
                  </h4>
                  <div className="space-y-2">
                    {sprintInits.map((i) => {
                      const boosted = !!buyerSelecionado && dimsBoost.has(i.dimensao_alvo);
                      return (
                      <div key={i.id} className={`p-3 rounded border ${boosted ? "border-volt/60 bg-volt/10 ring-1 ring-volt/30" : i.tipo === "migracao_arquetipo" ? "border-volt/60 bg-volt/5" : i.tipo === "derisk" ? "border-amber-500/30 bg-amber-500/5" : "border-volt/10 bg-slate-950/40"}`}>
                        <p className="font-medium text-sm break-words">{i.titulo}</p>
                        {i.descricao && <p className="text-xs text-muted-foreground mt-1 break-words">{i.descricao}</p>}
                        <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
                          <Badge variant="outline" className="border-volt/30 text-volt">+{i.delta_ipe} IPE</Badge>
                          <Badge variant="outline" className="border-volt/30">{brl(i.delta_valor)}</Badge>
                          <Badge variant="outline">{i.esforco}</Badge>
                          {i.tipo === "migracao_arquetipo" && <Badge className="bg-volt text-carbon text-[10px]">Migração</Badge>}
                          {i.tipo === "derisk" && <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">De-risk</Badge>}
                          {boosted && <Badge className="bg-volt/20 text-volt border-volt/40 text-[10px]"><Crosshair className="h-3 w-3 mr-0.5" />Alvo</Badge>}
                        </div>
                      </div>
                      );
                    })}
                    {sprintInits.length === 0 && (
                      <p className="text-xs text-muted-foreground">— sem iniciativas neste sprint —</p>
                    )}
                  </div>
                </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* COMPRADORES */}
          <TabsContent value="compradores" className="mt-4">
            <div className="grid md:grid-cols-3 gap-4">
              {buyers.map((b, i) => {
                const tone = b.arquetipo_comprador === "estrategico" ? "border-volt/40 bg-volt/5"
                           : b.arquetipo_comprador === "financeiro" ? "border-blue-500/30 bg-blue-500/5"
                           : "border-amber-500/30 bg-amber-500/5";
                return (
                  <Card key={b.id} className={`!bg-slate-900/60 backdrop-blur-md p-5 border ${b.selecionado ? "border-volt ring-2 ring-volt/50" : tone}`}>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                      <Badge className="bg-volt/10 text-volt border-volt/30 capitalize">{b.arquetipo_comprador}</Badge>
                      <div className="flex items-center gap-1">
                        {b.selecionado && <Badge className="bg-volt text-carbon text-[10px]"><Crosshair className="h-3 w-3 mr-0.5" />Alvo</Badge>}
                        {b.setor_alvo && <span className="text-[10px] uppercase text-muted-foreground tracking-wider">{b.setor_alvo}</span>}
                      </div>
                    </div>
                    {b.nome_alvo && <h4 className="font-semibold break-words">{b.nome_alvo}</h4>}
                    <p className="text-sm text-muted-foreground mt-2 break-words">{b.tese_aquisicao}</p>

                    {!!b.sinergias?.length && (
                      <div className="mt-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sinergias capturáveis</p>
                        <ul className="space-y-1">
                          {b.sinergias.slice(0, 5).map((s, idx) => (
                            <li key={idx} className="text-xs flex gap-1 break-words"><span className="text-volt">▸</span>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!!b.exemplos_targets?.length && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {b.exemplos_targets.slice(0, 5).map((e, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px] border-volt/20 bg-transparent">{e}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-volt/10">
                      <p className="text-xs text-muted-foreground">Prêmio estimado vs. múltiplo base</p>
                      <p className="text-lg font-bold text-volt">{b.premio_estimado_pct?.toFixed(0)}% · {brl(b.premio_estimado_valor)}</p>
                      {b.racional_premio && (
                        <p className="text-[11px] text-muted-foreground mt-1 break-words italic">{b.racional_premio}</p>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant={b.selecionado ? "default" : "outline"}
                        className={b.selecionado ? "bg-volt text-carbon hover:bg-volt/90 flex-1" : "bg-transparent flex-1"}
                        onClick={() => handleSelectBuyer(b)}
                      >
                        <Crosshair className="h-3 w-3 mr-1" />
                        {b.selecionado ? "Alvo definido" : "Definir como alvo"}
                      </Button>
                      <Button size="sm" variant="outline" className="bg-transparent" onClick={() => handleGenerateLetter(b)}>
                        {b.carta_convite ? <Mail className="h-3 w-3 mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        {b.carta_convite ? "Ver carta" : "Gerar carta"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
              {buyers.length === 0 && <p className="text-muted-foreground col-span-3 text-center py-10">Sem buyer map disponível.</p>}
            </div>
          </TabsContent>

          {/* DOCS */}
          <TabsContent value="docs" className="mt-4 space-y-3">
            <EquityDocsUpload
              assessmentId={assess.id}
              companyId={assess.company_id}
              onExtracted={() => { /* hint: user can hit Re-medir to re-run compute with new doc context */ }}
            />
            <p className="text-xs text-muted-foreground">
              Após anexar novos documentos, clique em <span className="text-volt">Re-medir</span> no topo para recalcular o diagnóstico incorporando os fatos extraídos.
            </p>
          </TabsContent>

          {/* PROGRESSO */}
          <TabsContent value="progresso" className="mt-4 space-y-4">
            {/* Resumo evolutivo entre últimas duas medições */}
            {progresso.length >= 2 && (() => {
              const last = progresso[progresso.length - 1];
              const prev = progresso[progresso.length - 2];
              const dIPE = (last.ipe || 0) - (prev.ipe || 0);
              const dValor = (Number(last.valor) || 0) - (Number(prev.valor) || 0);
              const dAlvo = (Number(last.valor_alvo) || 0) - (Number(prev.valor_alvo) || 0);
              const dias = Math.max(1, Math.round((+new Date(last.created_at) - +new Date(prev.created_at)) / 86400000));
              const Tone = ({ v }: { v: number }) => v > 0 ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : v < 0 ? <TrendingDown className="h-4 w-4 text-rose-400" /> : <Minus className="h-4 w-4 text-muted-foreground" />;
              const cls = (v: number) => v > 0 ? "text-emerald-400" : v < 0 ? "text-rose-400" : "text-muted-foreground";
              return (
                <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/20 p-5">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <h3 className="font-semibold">Evolução vs. medição anterior</h3>
                    <span className="text-xs text-muted-foreground">Janela: {dias} dia(s)</span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="p-3 rounded border border-volt/10 bg-slate-950/40">
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Δ IPE</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-2xl font-bold ${cls(dIPE)}`}>{dIPE > 0 ? "+" : ""}{dIPE}</span>
                        <Tone v={dIPE} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{prev.ipe} → {last.ipe}</p>
                    </div>
                    <div className="p-3 rounded border border-volt/10 bg-slate-950/40">
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Δ Valor atual</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-2xl font-bold ${cls(dValor)}`}>{dValor >= 0 ? "+" : ""}{brl(dValor)}</span>
                        <Tone v={dValor} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{brl(prev.valor)} → {brl(last.valor)}</p>
                    </div>
                    <div className="p-3 rounded border border-volt/10 bg-slate-950/40">
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Δ Valor potencial</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-2xl font-bold ${cls(dAlvo)}`}>{dAlvo >= 0 ? "+" : ""}{brl(dAlvo)}</span>
                        <Tone v={dAlvo} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{brl(prev.valor_alvo)} → {brl(last.valor_alvo)}</p>
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* Gráfico evolutivo */}
            <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5">
              <h3 className="font-semibold mb-3">Loop de re-medição</h3>
              {progresso.length < 2 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Re-meça o IPE após executar iniciativas para ver a curva de evolução.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={progresso.map(p => ({ data: new Date(p.created_at).toLocaleDateString("pt-BR"), IPE: p.ipe, Valor: Math.round(Number(p.valor)/1000) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="data" tick={{ fill: "#aaa", fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fill: "#aaa", fontSize: 11 }} domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "#aaa", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #D9F564" }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="IPE" stroke="#D9F564" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="Valor" stroke="#60a5fa" strokeWidth={2} name="Valor (R$ mil)" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Tabela comparativa dimensão-a-dimensão */}
            {progresso.length >= 2 && (() => {
              const last = progresso[progresso.length - 1];
              const prev = progresso[progresso.length - 2];
              const lastDims = last.dim_snapshot || {};
              const prevDims = prev.dim_snapshot || {};
              const rows = DIMENSOES.map(d => {
                const a = Number(prevDims[d.key] ?? 0);
                const b = Number(lastDims[d.key] ?? 0);
                return { key: d.key, label: d.label, prev: a, last: b, delta: b - a };
              }).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
              return (
                <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5">
                  <h3 className="font-semibold mb-3">Comparação dimensão-a-dimensão</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-muted-foreground border-b border-volt/10">
                          <th className="py-2 font-medium">Dimensão</th>
                          <th className="py-2 font-medium text-right">Antes</th>
                          <th className="py-2 font-medium text-right">Agora</th>
                          <th className="py-2 font-medium text-right">Δ</th>
                          <th className="py-2 font-medium w-1/3">Evolução</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(r => {
                          const tone = r.delta > 0 ? "text-emerald-400" : r.delta < 0 ? "text-rose-400" : "text-muted-foreground";
                          return (
                            <tr key={r.key} className="border-b border-volt/5">
                              <td className="py-2 break-words">{r.label}</td>
                              <td className="py-2 text-right font-mono text-muted-foreground">{r.prev}</td>
                              <td className="py-2 text-right font-mono">{r.last}</td>
                              <td className={`py-2 text-right font-mono font-bold ${tone}`}>{r.delta > 0 ? "+" : ""}{r.delta}</td>
                              <td className="py-2">
                                <div className="relative h-2 bg-slate-800 rounded overflow-hidden">
                                  <div className="absolute top-0 left-0 h-full bg-muted-foreground/40" style={{ width: `${r.prev}%` }} />
                                  <div className={`absolute top-0 left-0 h-full ${r.delta >= 0 ? "bg-volt/70" : "bg-rose-500/70"}`} style={{ width: `${r.last}%`, mixBlendMode: "screen" as any }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })()}

            {/* Histórico de rodadas */}
            {progresso.length >= 1 && (
              <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5">
                <h3 className="font-semibold mb-3">Histórico de medições</h3>
                <div className="space-y-2">
                  {[...progresso].reverse().map((p, idx) => (
                    <div key={p.id} className={`flex items-center justify-between p-3 rounded border ${p.assessment_id === assess.id ? "border-volt/40 bg-volt/5" : "border-volt/10 bg-slate-950/40"}`}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className="border-volt/30 bg-transparent">#{progresso.length - idx}</Badge>
                        <span className="text-sm">{new Date(p.created_at).toLocaleString("pt-BR")}</span>
                        {p.assessment_id === assess.id && <Badge className="bg-volt text-carbon text-[10px]">Esta rodada</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">IPE <span className="text-volt font-mono font-bold">{p.ipe}</span></span>
                        <span className="text-muted-foreground">{brl(p.valor)}</span>
                        {p.assessment_id && p.assessment_id !== assess.id && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(`/equity-planner/${p.assessment_id}`)}>Abrir</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
