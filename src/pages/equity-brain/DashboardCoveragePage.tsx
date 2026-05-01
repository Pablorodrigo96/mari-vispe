import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

const FIELD_INFO: Record<string, { label: string; alimenta: string }> = {
  deal_type:         { label: "Tipo (sellside/buyside)", alimenta: "Executivo: KPI Buyside/Sellside · Donut Tipo · Linha Anual" },
  deal_phase:        { label: "Fase do deal",            alimenta: "Executivo: Donut Fase Sellside · Match e NBO inteiros dependem disto" },
  outcome:           { label: "Outcome",                 alimenta: "Executivo: KPI Em Andamento/Concluídas/Canceladas · Match: status" },
  valor_operacao:    { label: "Valor da operação",       alimenta: "Executivo: Valor Total · Ticket Médio · Top 3 · NBO: Valor total/médio" },
  faturamento_vispe: { label: "Faturamento Vispe",       alimenta: "Executivo: Faturamento Vispe · NBO: Comissões total" },
  responsavel_id:    { label: "Responsável (advisor)",   alimenta: "Mandato: Por executivo · NBO: Por executivo" },
  data_assinatura:   { label: "Data de assinatura",      alimenta: "Executivo: Linha Evolução Anual · Match: Tempo médio" },
  uf:                { label: "UF",                      alimenta: "Todos os dashboards: Por estado · Por região (auto)" },
  setor:             { label: "Setor",                   alimenta: "Mandato: Por setor" },
};

export default function DashboardCoveragePage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["dashboard-coverage"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_coverage" as any);
      if (error) throw error;
      return data as { field: string; filled: number; empty: number; total: number }[];
    },
  });

  return (
    <div className="p-6 bg-[#0A0A0A] min-h-screen text-[#FAFAF7]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Cobertura dos Dashboards</h1>
        <p className="text-sm text-[#A8A8A3] mt-1 max-w-3xl">
          Cada gráfico dos dashboards (Executivo, Mandato, Match, NBO) é uma agregação de uma coluna dos mandatos.
          Quanto mais campos preenchidos, mais completos os gráficos. Clique em "Corrigir" para abrir a Tabela Mestre filtrada só com os mandatos vazios desse campo.
        </p>
      </div>

      {isLoading && <p className="text-[#A8A8A3]">Carregando…</p>}

      <div className="grid gap-3">
        {data.map((row) => {
          const info = FIELD_INFO[row.field] ?? { label: row.field, alimenta: "—" };
          const pct = row.total > 0 ? Math.round((Number(row.filled) / Number(row.total)) * 100) : 0;
          const ok = pct >= 80;
          return (
            <div key={row.field} className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-4 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                {ok ? <CheckCircle2 className="h-5 w-5 text-[#00D27F]" /> : <AlertCircle className="h-5 w-5 text-[#FFB800]" />}
                <div>
                  <div className="font-semibold">{info.label} <span className="text-[#5A5A55] font-mono text-xs ml-1">{row.field}</span></div>
                  <div className="text-xs text-[#A8A8A3] mt-0.5 break-words">{info.alimenta}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-mono font-bold" style={{ color: ok ? "#00D27F" : "#FFB800" }}>{pct}%</div>
                <div className="text-[10px] text-[#A8A8A3]">
                  {Number(row.filled).toLocaleString("pt-BR")} preenchidos · {Number(row.empty).toLocaleString("pt-BR")} vazios
                </div>
              </div>

              <Link to={`/equity-brain/mandatos/tabela?empty=${row.field}`}>
                <Button variant="outline" className="bg-transparent border-[#2A2A2A]" size="sm">
                  Corrigir <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-lg border border-[#D9F564]/30 bg-[#D9F564]/5 p-4 text-xs text-[#FAFAF7]">
        <strong>Regra simples (estilo Monday):</strong> abra a <Link to="/equity-brain/mandatos/tabela" className="underline text-[#D9F564]">Tabela mestre</Link>,
        clique em qualquer célula vazia, digite o valor, dê Enter. O gráfico correspondente aparece nos dashboards no próximo refresh (≤ 60s).
      </div>
    </div>
  );
}
