import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, AlertTriangle, Sparkles, Zap, Rocket, Brain } from "lucide-react";
import { ARQUETIPOS_LABEL } from "@/lib/equity-planner/constants";

interface Initiative {
  id: string;
  titulo: string;
  descricao: string | null;
  dimensao_alvo: string;
  delta_ipe: number;
  delta_valor: number;
  esforco: string;
  prazo_meses: number;
  sprint: number;
  status: string;
  tipo: string;
  prioridade: number;
}

interface Props {
  arquetipoId: string | null;
  classification: any | null;
  migracaoSugerida: any | null;
  initiatives: Initiative[];
  onOpenInitiative: (i: Initiative) => void;
  onBuildAnnualPlan: () => void;
  buildingAnnual: boolean;
  hasAnnualPlan: boolean;
}

const ILIQUIDOS = new Set(["servico_profissional", "projeto_obra"]);

export default function ModelLiquidityTab({
  arquetipoId,
  classification,
  migracaoSugerida,
  initiatives,
  onOpenInitiative,
  onBuildAnnualPlan,
  buildingAnnual,
  hasAnnualPlan,
}: Props) {
  const vendabilidade = classification?.vendabilidade_atual || null;
  const nota = Number(vendabilidade?.nota_0_100 ?? 0);
  const isIliquido = arquetipoId ? ILIQUIDOS.has(arquetipoId) : false;

  const notaTone =
    nota >= 65 ? { color: "text-emerald-400", border: "border-emerald-500/40", bg: "bg-emerald-500/10" } :
    nota >= 45 ? { color: "text-amber-400", border: "border-amber-500/40", bg: "bg-amber-500/10" } :
                 { color: "text-rose-400", border: "border-rose-500/40", bg: "bg-rose-500/10" };

  const modeloIniciativas = initiatives.filter((i) =>
    ["migracao_arquetipo", "reestruturacao_modelo"].includes(i.tipo)
  );

  return (
    <div className="space-y-5">
      {/* Vendabilidade atual */}
      <Card className="!bg-graphite/40 backdrop-blur-md border-white/10 p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className={`h-12 w-12 rounded-xl ${notaTone.bg} border ${notaTone.border} flex items-center justify-center shrink-0`}>
            <Brain className={`h-6 w-6 ${notaTone.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">Modelo atual</p>
            <h2 className="text-xl md:text-2xl font-bold text-white mt-1 break-words">
              {arquetipoId ? (ARQUETIPOS_LABEL[arquetipoId] || arquetipoId) : "—"}
            </h2>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-[10px] uppercase text-white/60 tracking-wider">Vendabilidade hoje</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-4xl font-bold ${notaTone.color} tabular-nums`}>{nota}</span>
                  <span className="text-white/60">/100</span>
                </div>
                <Progress value={nota} className="mt-2 h-1.5" />
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] uppercase text-white/60 tracking-wider">Por que esse é o número</p>
                <p className="text-sm text-white/80 mt-1 break-words leading-relaxed">
                  {vendabilidade?.motivo_baixa_liquidez || "—"}
                </p>
              </div>
            </div>
            {!!vendabilidade?.principais_obstaculos?.length && (
              <div className="mt-5">
                <p className="text-[10px] uppercase text-white/60 tracking-wider font-semibold">Principais obstáculos para vender essa empresa hoje</p>
                <ul className="mt-2 grid md:grid-cols-2 gap-2">
                  {vendabilidade.principais_obstaculos.map((o: string, i: number) => (
                    <li key={i} className="text-sm text-white/85 flex gap-2 items-start break-words">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Rota de migração recomendada */}
      {migracaoSugerida?.para_arquetipo_id ? (
        <Card className="relative overflow-hidden !bg-carbon/90 backdrop-blur-md border-volt/40 p-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-volt/10 via-transparent to-graphite/50" />
          <div className="flex items-start gap-4 flex-wrap">
            <div className="h-12 w-12 rounded-xl bg-volt/20 border border-volt/40 flex items-center justify-center shrink-0">
              <Rocket className="h-6 w-6 text-volt" />
            </div>
            <div className="relative flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-widest text-volt font-semibold">Rota de reestruturação recomendada</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className="bg-bone/10 text-bone border-bone/20 text-xs">
                  {arquetipoId ? (ARQUETIPOS_LABEL[arquetipoId] || arquetipoId) : "—"}
                </Badge>
                <ArrowRight className="h-4 w-4 text-volt" />
                <Badge className="bg-volt text-carbon text-xs font-semibold">
                  {ARQUETIPOS_LABEL[migracaoSugerida.para_arquetipo_id] || migracaoSugerida.para_arquetipo_id}
                </Badge>
                {migracaoSugerida.viabilidade && (
                  <Badge variant="outline" className="border-volt/40 text-volt text-[10px] bg-transparent">
                    Viabilidade: {migracaoSugerida.viabilidade}
                  </Badge>
                )}
              </div>
              {migracaoSugerida.racional && (
                <p className="text-sm text-bone/90 mt-3 break-words leading-relaxed border-l-2 border-volt pl-3">
                  {migracaoSugerida.racional}
                </p>
              )}
              {!!migracaoSugerida.bloqueadores?.length && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase text-bone/60 tracking-wider font-semibold">Bloqueadores que essa empresa precisa destravar</p>
                  <ul className="mt-2 space-y-1">
                    {migracaoSugerida.bloqueadores.map((b: string, i: number) => (
                      <li key={i} className="text-sm text-bone/85 flex gap-2 items-start break-words">
                        <span className="text-volt mt-1">›</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : isIliquido && (
        <Card className="!bg-amber-500/5 border-amber-500/30 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200">Sem rota de migração definida</p>
              <p className="text-sm text-white/80 mt-1 break-words">
                Esse modelo é de baixa liquidez. Clique em "Re-medir" no topo para que a Mari sugira a rota de reestruturação mais valiosa.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Iniciativas de reestruturação */}
      <Card className="!bg-graphite/40 backdrop-blur-md border-white/10 p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-volt font-semibold">Iniciativas de reestruturação de modelo</p>
            <h3 className="text-lg font-bold text-white mt-1">
              {modeloIniciativas.length} {modeloIniciativas.length === 1 ? "alavanca" : "alavancas"} para tornar a empresa vendável
            </h3>
          </div>
          <Badge className="bg-volt/15 text-volt border-volt/30">
            <Sparkles className="h-3 w-3 mr-1" /> Cada card abre um diagnóstico profundo
          </Badge>
        </div>

        {modeloIniciativas.length === 0 ? (
          <p className="text-sm text-white/70 break-words">
            Sua iniciativa de modelo ainda não foi gerada. Re-rode o diagnóstico para forçar a Mari a propor reestruturação.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {modeloIniciativas.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => onOpenInitiative(i)}
                className="text-left rounded-lg border border-volt/30 bg-carbon/60 hover:border-volt/60 hover:bg-volt/5 transition-colors p-4"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <Badge className="bg-volt text-carbon text-[10px] font-semibold">
                    {i.tipo === "migracao_arquetipo" ? "Migração de modelo" : "Reestruturação"}
                  </Badge>
                  <Badge variant="outline" className="border-white/20 text-white/70 text-[10px] bg-transparent">
                    Sprint {i.sprint} · {i.prazo_meses}m
                  </Badge>
                </div>
                <h4 className="text-sm font-semibold text-white mt-3 break-words leading-snug">{i.titulo}</h4>
                {i.descricao && (
                  <p className="text-xs text-white/70 mt-2 break-words leading-relaxed line-clamp-3">{i.descricao}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-[11px] text-white/60">
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-volt" /> +{i.delta_ipe} IPE</span>
                  <span>•</span>
                  <span>Esforço: {i.esforco}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* CTA Plano E1A */}
      <Card className="!bg-graphite/40 backdrop-blur-md border-volt/30 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-volt font-semibold">Plano E1A — Equity em 1 Ano</p>
            <h3 className="text-lg font-bold text-white mt-1 break-words">Construir o roteiro mês a mês focado em vendabilidade</h3>
            <p className="text-sm text-white/70 mt-1 break-words">
              Inclui trilha de transição de modelo, meta trimestral de receita recorrente e checklist de exit-readiness no mês 12.
            </p>
          </div>
          <Button
            className="bg-volt text-carbon hover:bg-volt/90 font-semibold"
            disabled={buildingAnnual}
            onClick={onBuildAnnualPlan}
          >
            <Rocket className="h-4 w-4 mr-2" />
            {hasAnnualPlan ? "Regenerar Plano E1A" : "Construir Plano E1A"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
