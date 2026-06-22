import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Target, Calendar, AlertTriangle, Link as LinkIcon } from "lucide-react";
import { brl } from "@/lib/equity-planner/constants";

const MES_LABEL = ["Mês 1","Mês 2","Mês 3","Mês 4","Mês 5","Mês 6","Mês 7","Mês 8","Mês 9","Mês 10","Mês 11","Mês 12"];

interface Props {
  plan: any;
}

export default function AnnualPlanTimeline({ plan }: Props) {
  const [openMes, setOpenMes] = useState<number | null>(1);

  if (!plan?.plan_data) return null;
  const { north_star, resumo_executivo, meses, trilha_vendabilidade } = plan.plan_data;
  const trilhaAtiva = !!trilha_vendabilidade?.ativa && Array.isArray(trilha_vendabilidade?.marcos_mensais) && trilha_vendabilidade.marcos_mensais.length > 0;

  return (
    <div className="space-y-5">
      {/* North star */}
      <Card className="!bg-gradient-to-br from-volt/15 via-volt/5 to-transparent border-volt/40 p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-12 w-12 rounded-xl bg-volt/20 border border-volt/40 flex items-center justify-center shrink-0">
            <Target className="h-6 w-6 text-volt" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-volt font-semibold">North Star — Equity em 1 Ano</p>
            <p className="text-xl md:text-2xl font-bold text-bone mt-1 break-words leading-snug">{north_star?.tese_central}</p>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-[10px] uppercase text-white/50 tracking-wider">IPE alvo 12m</p>
                <p className="text-2xl font-bold text-volt tabular-nums">{north_star?.ipe_alvo_12m ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-white/50 tracking-wider">Valor alvo 12m</p>
                <p className="text-2xl font-bold text-bone tabular-nums">{brl(north_star?.valor_alvo_12m)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-white/50 tracking-wider">Δ vs hoje</p>
                <p className="text-2xl font-bold text-emerald-400 tabular-nums">+{north_star?.delta_valor_pct ?? 0}%</p>
              </div>
            </div>
            {resumo_executivo && (
              <p className="text-sm text-bone/80 mt-4 break-words leading-relaxed border-l-2 border-volt pl-3">{resumo_executivo}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Trilha de Vendabilidade */}
      {trilhaAtiva && (
        <Card className="!bg-graphite/40 backdrop-blur-md border-volt/30 p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-volt font-semibold">Trilha de Vendabilidade</p>
              <p className="text-lg font-bold text-bone mt-1 break-words">
                {trilha_vendabilidade.modelo_origem || "Modelo atual"} → {trilha_vendabilidade.modelo_destino || "Modelo vendável"}
              </p>
            </div>
            {trilha_vendabilidade.meta_recorrencia_pct && (
              <div className="flex gap-2 flex-wrap">
                {["t1","t2","t3","t4"].map((t) => (
                  <Badge key={t} variant="outline" className="border-volt/40 text-volt bg-volt/5 text-[10px]">
                    {t.toUpperCase()}: {trilha_vendabilidade.meta_recorrencia_pct[t] ?? 0}% recorrente
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {trilha_vendabilidade.marcos_mensais.map((m: any, i: number) => (
              <div key={i} className="rounded-lg border border-volt/20 bg-carbon/60 p-3">
                <p className="text-[10px] uppercase tracking-widest text-volt font-bold tabular-nums">M{m.mes ?? i + 1}</p>
                <p className="text-xs text-bone/85 mt-1 break-words leading-snug">{m.marco}</p>
              </div>
            ))}
          </div>
          {!!trilha_vendabilidade.checklist_exit_readiness_m12?.length && (
            <div className="mt-5 pt-4 border-t border-white/10">
              <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">Checklist de exit-readiness no M12</p>
              <ul className="mt-2 grid md:grid-cols-2 gap-1.5">
                {trilha_vendabilidade.checklist_exit_readiness_m12.map((c: string, i: number) => (
                  <li key={i} className="text-xs text-bone/85 flex gap-2 items-start break-words">
                    <span className="text-emerald-400 mt-0.5">✓</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}


      {/* Timeline 12 meses */}
      <div className="space-y-2">
        {(meses || []).map((m: any) => {
          const isOpen = openMes === m.mes;
          return (
            <Card key={m.mes} className="!bg-graphite/40 backdrop-blur-md border-white/10 overflow-hidden hover:border-volt/30 transition-colors">
              <button
                type="button"
                onClick={() => setOpenMes(isOpen ? null : m.mes)}
                className="w-full p-4 flex items-center justify-between gap-4 text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-volt/10 border border-volt/30 flex items-center justify-center text-volt font-bold text-sm shrink-0 tabular-nums">
                    M{m.mes}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-white/50 font-semibold">{MES_LABEL[m.mes - 1]}</p>
                    <p className="text-base font-semibold text-bone break-words">{m.tema}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className="border-white/15 bg-transparent text-white/70 text-[10px]">{(m.acoes || []).length} ações</Badge>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-white/60" /> : <ChevronDown className="h-4 w-4 text-white/60" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                  {(m.acoes || []).map((a: any, i: number) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-carbon/60 p-4">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h4 className="font-semibold text-bone text-sm break-words flex-1 min-w-0">{a.titulo}</h4>
                        {a.responsavel && (
                          <Badge className="bg-volt/15 text-volt border-volt/30 text-[10px]">{a.responsavel}</Badge>
                        )}
                      </div>
                      {a.descricao && <p className="text-sm text-bone/75 mt-2 break-words leading-relaxed">{a.descricao}</p>}
                      <div className="grid md:grid-cols-2 gap-3 mt-3">
                        {a.kpi_saida && (
                          <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2">
                            <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">KPI de saída</p>
                            <p className="text-xs text-bone/85 mt-0.5 break-words">{a.kpi_saida}</p>
                          </div>
                        )}
                        {a.iniciativa_origem && (
                          <div className="rounded border border-volt/20 bg-volt/5 p-2">
                            <p className="text-[10px] uppercase tracking-widest text-volt font-semibold flex items-center gap-1"><LinkIcon className="h-2.5 w-2.5" />Iniciativa origem</p>
                            <p className="text-xs text-bone/85 mt-0.5 break-words">{a.iniciativa_origem}</p>
                          </div>
                        )}
                      </div>
                      {!!a.dependencias?.length && (
                        <div className="mt-3">
                          <p className="text-[10px] uppercase tracking-widest text-white/50 font-semibold flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />Dependências</p>
                          <ul className="mt-1 space-y-0.5">
                            {a.dependencias.map((d: string, j: number) => (
                              <li key={j} className="text-xs text-bone/70 break-words flex gap-1"><span className="text-white/30">›</span>{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {!!a.riscos?.length && (
                        <div className="mt-3">
                          <p className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5" />Riscos</p>
                          <ul className="mt-1 space-y-0.5">
                            {a.riscos.map((r: string, j: number) => (
                              <li key={j} className="text-xs text-amber-200/80 break-words flex gap-1"><span className="text-amber-400/40">›</span>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
