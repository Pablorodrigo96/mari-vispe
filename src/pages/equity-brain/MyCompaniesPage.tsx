import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Briefcase, ExternalLink } from "lucide-react";
import { brl } from "@/lib/dealFormatters";
import { cn } from "@/lib/utils";

type Row = {
  mandate_id: string;
  cnpj: string;
  company_name: string | null;
  codename: string | null;
  pipeline_stage: string;
  deal_kind: string | null;
  deal_origin: string | null;
  outcome: string;
  valor_pedido: number | null;
  valor_operacao: number | null;
  needs_enrichment: boolean | null;
  stage_changed_at: string | null;
  my_role: "responsavel" | "co_advisor" | "originador" | "criador" | null;
};

const ROLE_LABEL: Record<string, string> = {
  responsavel: "Responsável",
  co_advisor: "Co-advisor",
  originador: "Originador",
  criador: "Criador",
};

const ROLE_COLOR: Record<string, string> = {
  responsavel: "bg-emerald-500/15 text-emerald-300 border-emerald-700/40",
  co_advisor: "bg-blue-500/15 text-blue-300 border-blue-700/40",
  originador: "bg-purple-500/15 text-purple-300 border-purple-700/40",
  criador: "bg-zinc-500/15 text-zinc-300 border-zinc-700/40",
};

const KIND_LABEL: Record<string, string> = {
  mandato_assinado: "Mandato",
  vendedor_sem_mandato: "Sem mandato",
  marketplace_listing: "Marketplace",
  buyer_mandate: "Buyer",
  prospeccao: "Prospecção",
};

const KIND_COLOR: Record<string, string> = {
  mandato_assinado: "bg-emerald-500/15 text-emerald-300 border-emerald-700/40",
  vendedor_sem_mandato: "bg-amber-500/15 text-amber-300 border-amber-700/40",
  marketplace_listing: "bg-blue-500/15 text-blue-300 border-blue-700/40",
  buyer_mandate: "bg-purple-500/15 text-purple-300 border-purple-700/40",
  prospeccao: "bg-zinc-500/15 text-zinc-300 border-zinc-700/40",
};

export default function MyCompaniesPage() {
  const { user } = useAuth();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["my-companies-v2", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("eb_my_companies_v2" as any)
        .select("mandate_id,cnpj,company_name,codename,pipeline_stage,deal_kind,deal_origin,outcome,valor_pedido,valor_operacao,needs_enrichment,stage_changed_at,my_role")
        .neq("outcome", "cancelado")
        .order("stage_changed_at", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
    enabled: !!user,
  });

  const totalValue = (rows ?? []).reduce((s, r) => s + Number(r.valor_operacao ?? 0), 0);
  const byStage = (rows ?? []).reduce((acc: Record<string, number>, r) => {
    acc[r.pipeline_stage] = (acc[r.pipeline_stage] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-4 bg-zinc-950 min-h-full">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/equity-brain/crm" className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> CRM
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1 tracking-tight inline-flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#D9F564]" />
            Minhas empresas / Carteira
          </h1>
          <p className="text-xs text-zinc-400 mt-1 break-words">
            Mandatos e deals onde você é o responsável atribuído.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[10px] uppercase text-zinc-500">Total de deals</div>
          <div className="text-2xl font-bold text-zinc-100 tabular-nums">{rows?.length ?? 0}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[10px] uppercase text-zinc-500">Valor total</div>
          <div className="text-2xl font-bold text-emerald-300 tabular-nums">{brl(totalValue, { compact: true })}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[10px] uppercase text-zinc-500">Em closing</div>
          <div className="text-2xl font-bold text-amber-300 tabular-nums">{byStage.closing ?? 0}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[10px] uppercase text-zinc-500">Em NBO</div>
          <div className="text-2xl font-bold text-blue-300 tabular-nums">{byStage.nbo ?? 0}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-zinc-500 p-6">Carregando…</div>
      ) : (rows ?? []).length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-center">
          <p className="text-sm text-zinc-300 mb-2">Nenhum deal vinculado a você ainda.</p>
          <p className="text-xs text-zinc-500">Você aparece aqui quando é responsável, co-advisor, originador ou criador de um mandato. Peça a um admin para te atribuir no CRM.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Empresa</th>
                <th className="text-left px-3 py-2 font-medium">Meu papel</th>
                <th className="text-left px-3 py-2 font-medium">Tipo</th>
                <th className="text-left px-3 py-2 font-medium">Etapa</th>
                <th className="text-right px-3 py-2 font-medium">Valor</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {(rows ?? []).map((r) => (
                <tr key={r.mandate_id} className="hover:bg-zinc-900/60">
                  <td className="px-3 py-2 text-zinc-100 font-medium break-words max-w-[260px]" title={r.company_name ?? r.cnpj}>
                    {r.company_name ?? r.codename ?? r.cnpj}
                    {r.needs_enrichment && <span className="ml-1 text-amber-400" title="Precisa enriquecer">⚠</span>}
                  </td>
                  <td className="px-3 py-2">
                    {r.my_role && (
                      <span className={cn("text-[9px] uppercase px-1.5 py-0.5 rounded border", ROLE_COLOR[r.my_role] ?? "bg-zinc-800 text-zinc-400 border-zinc-700")}>
                        {ROLE_LABEL[r.my_role] ?? r.my_role}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.deal_kind && (
                      <span className={cn("text-[9px] uppercase px-1.5 py-0.5 rounded border", KIND_COLOR[r.deal_kind] ?? "bg-zinc-800 text-zinc-400 border-zinc-700")}>
                        {KIND_LABEL[r.deal_kind] ?? r.deal_kind}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{r.pipeline_stage}</td>
                  <td className="px-3 py-2 text-right text-emerald-300 tabular-nums">{(r.valor_operacao ?? r.valor_pedido) ? brl((r.valor_operacao ?? r.valor_pedido) as number, { compact: true }) : "—"}</td>
                  <td className="px-3 py-2">
                    <Link to={`/equity-brain/crm/mandate/${r.mandate_id}`} className="text-zinc-500 hover:text-[#D9F564] inline-flex">
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
