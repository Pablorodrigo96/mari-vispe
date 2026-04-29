import { useCrmKpis } from "@/hooks/useCrm";
import { formatBRL } from "@/lib/equityBrain";

function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
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
  const totalOps = (data.total_mandates ?? 0) + (data.total_buyers_active ?? 0);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      <Kpi label="Total Operações" value={totalOps} />
      <Kpi label="Vendedores" value={data.total_mandates ?? 0} accent="text-emerald-300" />
      <Kpi label="Compradores" value={data.total_buyers_active ?? 0} accent="text-blue-300" />
      <Kpi label="Em andamento" value={data.mandates_em_negociacao ?? 0} accent="text-amber-300" />
      <Kpi label="Concluídas" value={data.mandates_vendemos ?? 0} accent="text-emerald-400" />
      <Kpi label="Canceladas" value={data.mandates_cancelado ?? 0} accent="text-rose-300" />
      <Kpi label="Carteira (R$)" value={formatBRL(data.valor_total_carteira ?? 0)} />
      <Kpi label="Comissão Vispe" value={formatBRL(data.comissao_realizada ?? 0)} accent="text-emerald-300" />
    </div>
  );
}
