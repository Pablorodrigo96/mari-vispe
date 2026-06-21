import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, ArrowLeft, TrendingUp, Users, Activity, Target, LineChart as LineIcon, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import { DIMENSOES, ARQUETIPOS_LABEL, VEREDITO_LABEL, brl } from "@/lib/equity-planner/constants";

interface Assessment {
  id: string; ipe_composto: number | null; arquetipo_id: string | null;
  veredito_liquidez: string | null; summary: string | null; status: string;
  company_id: string; confianca_arquetipo: number | null;
  migracao_arquetipo_sugerida: any | null;
  archetype_classification: any | null;
}
interface DimScore { dimensao: string; score: number; peso: number; destruidor_top: boolean; evidencias: any; }
interface Valuation { id: string; ebitda_normalizado: number; multiplo_aplicado: number; faixa_min: number; faixa_max: number; valor_atual: number; valor_alvo: number; }
interface Bridge { parcela: string; descricao: string; delta_valor: number; ordem: number; }
interface Initiative { id: string; titulo: string; descricao: string | null; dimensao_alvo: string; delta_ipe: number; delta_valor: number; esforco: string; prazo_meses: number; sprint: number; status: string; tipo: string; prioridade: number; }
interface Buyer { arquetipo_comprador: string; nome_alvo: string | null; tese_aquisicao: string | null; premio_estimado_pct: number; premio_estimado_valor: number; }
interface Progresso { ipe: number; valor: number; created_at: string; evento: string; }

export default function EquityPlannerAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [assess, setAssess] = useState<Assessment | null>(null);
  const [dims, setDims] = useState<DimScore[]>([]);
  const [val, setVal] = useState<Valuation | null>(null);
  const [bridge, setBridge] = useState<Bridge[]>([]);
  const [inits, setInits] = useState<Initiative[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [progresso, setProgresso] = useState<Progresso[]>([]);

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
          <Button variant="outline" className="bg-transparent" disabled={recomputing} onClick={handleRecompute}>
            {recomputing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Re-medir
          </Button>
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
          <TabsContent value="valor" className="mt-4">
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
            <div className="grid md:grid-cols-4 gap-3">
              {[1,2,3,4].map((sp) => (
                <Card key={sp} className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-4">
                  <h4 className="font-semibold mb-3 flex items-center justify-between">
                    <span>Sprint {sp}</span>
                    <span className="text-xs text-muted-foreground">Q{sp}</span>
                  </h4>
                  <div className="space-y-2">
                    {inits.filter((i) => i.sprint === sp).map((i) => (
                      <div key={i.id} className={`p-3 rounded border ${i.tipo === "migracao_arquetipo" ? "border-volt/60 bg-volt/5" : i.tipo === "derisk" ? "border-amber-500/30 bg-amber-500/5" : "border-volt/10 bg-slate-950/40"}`}>
                        <p className="font-medium text-sm break-words">{i.titulo}</p>
                        {i.descricao && <p className="text-xs text-muted-foreground mt-1 break-words">{i.descricao}</p>}
                        <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
                          <Badge variant="outline" className="border-volt/30 text-volt">+{i.delta_ipe} IPE</Badge>
                          <Badge variant="outline" className="border-volt/30">{brl(i.delta_valor)}</Badge>
                          <Badge variant="outline">{i.esforco}</Badge>
                          {i.tipo === "migracao_arquetipo" && <Badge className="bg-volt text-carbon text-[10px]">Migração</Badge>}
                          {i.tipo === "derisk" && <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">De-risk</Badge>}
                        </div>
                      </div>
                    ))}
                    {inits.filter((i) => i.sprint === sp).length === 0 && (
                      <p className="text-xs text-muted-foreground">— sem iniciativas neste sprint —</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* COMPRADORES */}
          <TabsContent value="compradores" className="mt-4">
            <div className="grid md:grid-cols-3 gap-4">
              {buyers.map((b, i) => (
                <Card key={i} className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5">
                  <Badge className="bg-volt/10 text-volt border-volt/30 mb-2">{b.arquetipo_comprador}</Badge>
                  {b.nome_alvo && <h4 className="font-semibold break-words">{b.nome_alvo}</h4>}
                  <p className="text-sm text-muted-foreground mt-2 break-words">{b.tese_aquisicao}</p>
                  <div className="mt-3 pt-3 border-t border-volt/10">
                    <p className="text-xs text-muted-foreground">Prêmio estimado</p>
                    <p className="text-lg font-bold text-volt">{b.premio_estimado_pct?.toFixed(0)}% · {brl(b.premio_estimado_valor)}</p>
                  </div>
                </Card>
              ))}
              {buyers.length === 0 && <p className="text-muted-foreground col-span-3 text-center py-10">Sem buyer map disponível.</p>}
            </div>
          </TabsContent>

          {/* PROGRESSO */}
          <TabsContent value="progresso" className="mt-4">
            <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5">
              <h3 className="font-semibold mb-3">Loop de re-medição</h3>
              {progresso.length < 2 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Re-meça o IPE após executar iniciativas para ver a curva de evolução.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={progresso.map(p => ({ data: new Date(p.created_at).toLocaleDateString("pt-BR"), IPE: p.ipe, Valor: Math.round(p.valor/1000) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="data" tick={{ fill: "#aaa", fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fill: "#aaa", fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "#aaa", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #D9F564" }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="IPE" stroke="#D9F564" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="Valor" stroke="#60a5fa" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
