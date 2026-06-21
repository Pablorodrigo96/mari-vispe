import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, Sparkles, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { DIMENSOES, PORTE_OPTIONS } from "@/lib/equity-planner/constants";

type Mode = "wizard" | "meeting_paste";
type Step = 0 | 1 | 2 | 3 | 4;

export default function EquityPlannerNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [mode, setMode] = useState<Mode>("wizard");
  const [loading, setLoading] = useState(false);

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

  if (!user) {
    navigate("/auth?next=/equity-planner/novo");
    return null;
  }

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

  const handleSubmit = async () => {
    if (!razao && !cnpj) {
      toast.error("Preencha razão social ou CNPJ.");
      return;
    }
    setLoading(true);
    try {
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

      const intakeText = buildIntakeText();
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

      toast.info("Calculando IPE, valuation e plano…", { duration: 5000 });
      const { data: out, error: fErr } = await supabase.functions.invoke("equity-planner-compute", {
        body: {
          assessmentId: assess.id,
          intakeText,
          companyData: { razao_social: razao, cnpj, setor_livre: setor, porte, uf,
            faturamento_declarado: faturamento, ebitda_declarado: ebitda },
        },
      });
      if (fErr) throw fErr;
      if (out?.error) throw new Error(out.error);

      toast.success("Diagnóstico pronto!");
      navigate(`/equity-planner/${assess.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao gerar diagnóstico: " + (e?.message || "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / 5) * 100;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">Equity Planner · Novo diagnóstico</p>
          <Progress value={progress} className="h-1.5" />
        </div>

        <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-6">
          {/* Step 0 — escolher modo */}
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
                    <p className="text-sm text-muted-foreground break-words">Cole a transcrição ou ata da sessão de diagnóstico. A IA extrai e preenche o data model.</p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* Step 1 — identificação */}
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

          {/* Step 2 — dados financeiros */}
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

          {/* Step 3 — auto-avaliação OU paste */}
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

          {/* Step 4 — observações + submit */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Algo mais a contar?</h2>
              <p className="text-sm text-muted-foreground">Opcional. Qualquer detalhe que ajude a IA a entender contexto.</p>
              <Textarea value={observ} onChange={(e) => setObserv(e.target.value)} className="min-h-[160px]"
                placeholder="Ex.: temos um contrato de R$500k/mês que renova em 6 meses; sócio quer sair em 18 meses..." />
              <div className="text-sm bg-volt/5 border border-volt/20 rounded p-3 break-words">
                Ao continuar, geramos seu Raio-X, Valuation com Value Bridge, plano em sprints e mapa de compradores.
                Leva ~30 segundos.
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <Button variant="outline" className="bg-transparent" disabled={step === 0 || loading} onClick={() => setStep((s) => (s - 1) as Step)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            {step < 4 ? (
              <Button className="bg-volt text-carbon hover:bg-volt/90" onClick={() => setStep((s) => (s + 1) as Step)}>
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button className="bg-volt text-carbon hover:bg-volt/90" disabled={loading} onClick={handleSubmit}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando…</> : <>Gerar diagnóstico <Sparkles className="ml-2 h-4 w-4" /></>}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
