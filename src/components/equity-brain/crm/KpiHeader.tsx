import { useCrmKpis } from "@/hooks/useCrm";
import { formatBRL } from "@/lib/equityBrain";
import { InfoHint, type InfoHintProps } from "@/components/equity-brain/InfoHint";
import { EB_TIPS } from "@/lib/ebTooltips";

function Kpi({
  label,
  value,
  accent,
  info,
}: {
  label: string;
  value: string | number;
  accent?: string;
  info?: Omit<InfoHintProps, "side" | "align" | "className" | "iconClassName">;
}) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-3">
      <div className="flex items-center gap-1.5">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 truncate">{label}</div>
        {info && <InfoHint {...info} />}
      </div>
      <div className={`text-2xl font-bold mt-1 ${accent ?? "text-zinc-100"}`}>{value}</div>
    </div>
  );
}

export function KpiHeader() {
  const { data, isLoading } = useCrmKpis();
  if (isLoading || !data) {
    return <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 animate-pulse">
      {Array.from({ length: 8 }).map((_,i)=>(
        <div key={i} className="h-20 bg-zinc-900/60 border border-zinc-800 rounded-lg" />
      ))}
    </div>;
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Kpi label="Mandatos assinados" value={data.total_mandates_real ?? 0} accent="text-emerald-300" info={EB_TIPS.vendedores} />
        <Kpi label="Vend. sem mandato" value={data.total_vendedores_sem_mandato ?? 0} accent="text-amber-300" info={EB_TIPS.vendedores} />
        <Kpi label="Marketplace" value={data.total_marketplace ?? 0} accent="text-blue-300" info={EB_TIPS.vendedores} />
        <Kpi label="Compradores" value={data.total_buyers_active ?? 0} accent="text-cyan-300" info={EB_TIPS.compradores} />
        <Kpi label="Em negociação" value={data.mandates_em_negociacao ?? 0} accent="text-amber-200" info={EB_TIPS.em_andamento} />
        <Kpi label="Concluídas" value={data.mandates_vendemos ?? 0} accent="text-emerald-400" info={EB_TIPS.concluidas} />
        <Kpi label="Carteira (R$)" value={formatBRL(data.valor_total_carteira ?? 0)} info={EB_TIPS.carteira_rs} />
        <Kpi label="Comissão Vispe" value={formatBRL(data.comissao_realizada ?? 0)} accent="text-emerald-300" info={EB_TIPS.comissao_vispe} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Sem responsável" value={data.mandates_sem_responsavel ?? 0} accent="text-rose-300" />
        <Kpi label="Precisa enriquecer CNPJ" value={data.mandates_precisa_enriquecer ?? 0} accent="text-rose-300" />
        <Kpi label="Presos em Match >30d" value={data.mandates_presos_match ?? 0} accent="text-rose-300" />
        <Kpi label="Total no CRM" value={data.total_mandates ?? 0} accent="text-zinc-200" />
      </div>
    </div>
  );
}
