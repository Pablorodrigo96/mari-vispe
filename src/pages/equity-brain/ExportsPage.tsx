import { Link } from "react-router-dom";
import { ArrowLeft, Download, FileSpreadsheet, Briefcase, Target, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv } from "@/lib/csvExport";
import { toast } from "sonner";
import { useState } from "react";

type ExportKey = "deals" | "mandates" | "buyers" | "activities";

const today = () => new Date().toISOString().slice(0, 10);

export default function ExportsPage() {
  const [busy, setBusy] = useState<ExportKey | null>(null);

  const run = async (key: ExportKey) => {
    setBusy(key);
    try {
      if (key === "deals") {
        const { data, error } = await (supabase as any)
          .from("eb_v_deal_metrics")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        downloadCsv(`mari-deals-${today()}.csv`, data ?? []);
      } else if (key === "mandates") {
        const { data, error } = await (supabase as any)
          .from("eb_mandates_enriched")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        downloadCsv(`mari-mandatos-${today()}.csv`, data ?? []);
      } else if (key === "buyers") {
        const { data, error } = await (supabase as any)
          .from("eb_buyers_enriched")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        downloadCsv(`mari-buyers-${today()}.csv`, data ?? []);
      } else if (key === "activities") {
        const { data, error } = await (supabase as any)
          .from("eb_crm_activities" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5000);
        if (error) throw error;
        downloadCsv(`mari-atividades-${today()}.csv`, data ?? []);
      }
      toast.success("Exportação concluída");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao exportar");
    } finally {
      setBusy(null);
    }
  };

  const cards: { key: ExportKey; title: string; desc: string; Icon: any }[] = [
    {
      key: "deals",
      title: "Deals (visão Monday)",
      desc: "Todos os mandatos com tipo, estágio, resultado, valor da operação, faturamento Vispe, comissão e datas.",
      Icon: FileSpreadsheet,
    },
    {
      key: "mandates",
      title: "Mandatos enriquecidos",
      desc: "Linhas completas de mandatos com dados da empresa, contato e métricas.",
      Icon: Briefcase,
    },
    {
      key: "buyers",
      title: "Buyers enriquecidos",
      desc: "Lista completa de buyers (CNPJ, ticket, setor, região, temperatura).",
      Icon: Target,
    },
    {
      key: "activities",
      title: "Atividades do CRM",
      desc: "Histórico de interações: ligações, mensagens, mudanças de estágio (últimas 5.000).",
      Icon: Activity,
    },
  ];

  return (
    <div className="p-6 space-y-5 bg-zinc-950 min-h-full">
      <Link to="/equity-brain/crm" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-3 w-3" /> Voltar ao CRM
      </Link>

      <header className="border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-bold text-zinc-100">Exports</h1>
        <p className="text-[11px] text-zinc-500 mt-1">
          Baixe os dados em CSV (separador ;, codificação UTF-8 com BOM — abre direto no Excel).
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map(({ key, title, desc, Icon }) => (
          <div key={key} className="rounded border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-zinc-800/60 text-[#D9F564]">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm text-zinc-100 font-medium">{title}</div>
                <p className="text-[11px] text-zinc-400 mt-1 break-words">{desc}</p>
              </div>
            </div>
            <button
              onClick={() => run(key)}
              disabled={busy === key}
              className="self-end inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[#D9F564]/40 text-[#D9F564] hover:bg-[#D9F564]/10 text-xs disabled:opacity-50"
            >
              <Download className="h-3 w-3" /> {busy === key ? "Exportando…" : "Baixar CSV"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
