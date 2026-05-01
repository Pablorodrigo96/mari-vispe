import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Pencil,
  ExternalLink,
  FolderOpen,
  FileSignature,
  ChevronDown,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  brl,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABEL,
  DEAL_TYPE_LABEL,
  OUTCOME_LABEL,
  OUTCOME_COLOR,
} from "@/lib/dealFormatters";
import { QuickEditPopover } from "./QuickEditPopover";
import { whatsAppLinkFor } from "@/lib/crmWhatsapp";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  company_cnpj: string;
  display_name: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  codename: string | null;
  deal_type: string;
  deal_kind: string | null;
  deal_origin: string | null;
  deal_confidence: string | null;
  needs_enrichment: boolean | null;
  pipeline_stage: string;
  outcome: string;
  valor_operacao: number | null;
  faturamento_vispe: number | null;
  commission_pct: number | null;
  uf: string | null;
  regiao: string | null;
  setor: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  responsavel_id: string | null;
  temperature: string | null;
  stage_changed_at: string | null;
  data_inicio: string | null;
  data_fechamento: string | null;
  data_assinatura: string | null;
  comprador_cnpj: string | null;
  comprador_nome: string | null;
  drive_url: string | null;
  contract_url: string | null;
};

const DEAL_KIND_LABEL: Record<string, string> = {
  mandato_assinado: "Mandato",
  vendedor_sem_mandato: "Vendedor",
  buyer_mandate: "Buyside",
  marketplace_listing: "Marketplace",
  prospeccao: "Prospecção",
};

const DEAL_KIND_COLOR: Record<string, string> = {
  mandato_assinado: "bg-emerald-500/15 text-emerald-300 border-emerald-700/40",
  vendedor_sem_mandato: "bg-amber-500/15 text-amber-300 border-amber-700/40",
  buyer_mandate: "bg-blue-500/15 text-blue-300 border-blue-700/40",
  marketplace_listing: "bg-cyan-500/15 text-cyan-300 border-cyan-700/40",
  prospeccao: "bg-zinc-500/15 text-zinc-300 border-zinc-700/40",
};

const STAGE_ACCENT: Record<string, string> = {
  match: "bg-blue-500/10 border-l-blue-500",
  nbo: "bg-cyan-500/10 border-l-cyan-500",
  due_diligence: "bg-amber-500/10 border-l-amber-500",
  spa: "bg-purple-500/10 border-l-purple-500",
  closing: "bg-orange-500/10 border-l-orange-500",
  closed: "bg-emerald-500/10 border-l-emerald-500",
};

type KindFilter = "all" | "mandato_assinado" | "vendedor_sem_mandato" | "buyer_mandate" | "marketplace_listing" | "prospeccao" | "no_owner" | "needs_enrichment";

export function MandatesMondayTable() {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["mandates-monday"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_mandates_enriched" as any)
        .select(
          "id,company_cnpj,display_name,razao_social,nome_fantasia,codename,deal_type,deal_kind,deal_origin,deal_confidence,needs_enrichment,pipeline_stage,outcome,valor_operacao,faturamento_vispe,commission_pct,uf,regiao,setor_ma,contato_nome,contato_telefone,responsavel_id,temperature,stage_changed_at,data_inicio,data_fechamento,data_assinatura,comprador_cnpj,comprador_nome,drive_url,contract_url",
        )
        .order("stage_changed_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({ ...r, setor: r.setor_ma })) as unknown as Row[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return (data ?? []) as { user_id: string; full_name: string | null }[];
    },
  });
  const respMap = useMemo(
    () => new Map(profiles.map((p) => [p.user_id, p.full_name || "—"])),
    [profiles],
  );

  const filtered = useMemo(() => {
    let out = rows;
    if (kindFilter === "no_owner") out = out.filter((r) => !r.responsavel_id);
    else if (kindFilter === "needs_enrichment") out = out.filter((r) => r.needs_enrichment);
    else if (kindFilter !== "all") out = out.filter((r) => r.deal_kind === kindFilter);
    if (q) {
      const t = q.toLowerCase();
      out = out.filter((r) =>
        (r.display_name ?? "").toLowerCase().includes(t) ||
        (r.company_cnpj ?? "").includes(t.replace(/\D/g, "")) ||
        (r.comprador_nome ?? "").toLowerCase().includes(t) ||
        (r.contato_nome ?? "").toLowerCase().includes(t));
    }
    return out;
  }, [rows, q, kindFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, Row[]> = {};
    PIPELINE_STAGES.forEach((s) => (g[s] = []));
    filtered.forEach((r) => {
      const s = r.pipeline_stage || "match";
      (g[s] ?? (g[s] = [])).push(r);
    });
    return g;
  }, [filtered]);

  const counts = useMemo(() => ({
    all: rows.length,
    mandato_assinado: rows.filter((r) => r.deal_kind === "mandato_assinado").length,
    vendedor_sem_mandato: rows.filter((r) => r.deal_kind === "vendedor_sem_mandato").length,
    buyer_mandate: rows.filter((r) => r.deal_kind === "buyer_mandate").length,
    marketplace_listing: rows.filter((r) => r.deal_kind === "marketplace_listing").length,
    prospeccao: rows.filter((r) => r.deal_kind === "prospeccao").length,
    no_owner: rows.filter((r) => !r.responsavel_id).length,
    needs_enrichment: rows.filter((r) => r.needs_enrichment).length,
  }), [rows]);

  const FILTERS: { key: KindFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "mandato_assinado", label: "Mandatos" },
    { key: "vendedor_sem_mandato", label: "Sem mandato" },
    { key: "buyer_mandate", label: "Buyside" },
    { key: "marketplace_listing", label: "Marketplace" },
    { key: "prospeccao", label: "Prospecção" },
    { key: "no_owner", label: "Sem dono" },
    { key: "needs_enrichment", label: "Precisa enriquecer" },
  ];

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-zinc-100 flex-1">
          Pipeline operacional{" "}
          <span className="text-zinc-500 font-normal">({filtered.length})</span>
        </h3>
        <div className="relative w-64">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nome, CNPJ, comprador, contato…"
            className="pl-7 h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-100"
          />
        </div>
      </div>
      <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-1 flex-wrap bg-zinc-950/40">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setKindFilter(f.key)}
            className={cn(
              "text-[10px] px-2 py-1 rounded border whitespace-nowrap",
              kindFilter === f.key
                ? "border-[#D9F564]/50 bg-[#D9F564]/10 text-[#D9F564]"
                : "border-zinc-800 bg-transparent text-zinc-400 hover:text-zinc-200",
            )}
          >
            {f.label} <span className="ml-1 text-zinc-500 tabular-nums">{counts[f.key as keyof typeof counts] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="overflow-auto max-h-[70vh]">
        {isLoading && (
          <div className="p-6 text-center text-xs text-zinc-500">Carregando…</div>
        )}

        {!isLoading &&
          PIPELINE_STAGES.map((stage) => {
            const items = grouped[stage] ?? [];
            if (items.length === 0) return null;
            const sumValue = items.reduce(
              (s, r) => s + Number(r.valor_operacao ?? 0),
              0,
            );
            const sumCommission = items.reduce(
              (s, r) => s + Number(r.faturamento_vispe ?? 0),
              0,
            );
            const isCol = collapsed[stage];

            return (
              <div key={stage} className={cn("border-l-4", STAGE_ACCENT[stage])}>
                <button
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [stage]: !c[stage] }))
                  }
                  className="w-full px-4 py-2 bg-zinc-950/70 border-b border-zinc-800 sticky top-0 z-10 flex items-center gap-2 hover:bg-zinc-900/70"
                >
                  {isCol ? (
                    <ChevronRight className="h-3 w-3 text-zinc-400" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-zinc-400" />
                  )}
                  <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                    {PIPELINE_STAGE_LABEL[stage]}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {items.length} clientes
                  </span>
                  <div className="ml-auto flex items-center gap-3 text-[10px] text-zinc-400 tabular-nums">
                    <span>
                      Σ Operação{" "}
                      <span className="text-emerald-300">
                        {brl(sumValue, { compact: true })}
                      </span>
                    </span>
                    <span>
                      Σ Vispe{" "}
                      <span className="text-[#D9F564]">
                        {brl(sumCommission, { compact: true })}
                      </span>
                    </span>
                  </div>
                </button>

                {!isCol && (
                  <table className="w-full text-[11px]">
                    <thead className="text-[9px] uppercase text-zinc-500">
                      <tr className="border-b border-zinc-800 bg-zinc-950/40">
                        <th className="text-left px-3 py-1.5 font-medium">
                          Vendedor
                        </th>
                        <th className="text-left px-2 py-1.5 font-medium">
                          Comprador (MATCH)
                        </th>
                        <th className="text-left px-2 py-1.5 font-medium">Tipo</th>
                        <th className="text-left px-2 py-1.5 font-medium">
                          Status
                        </th>
                        <th className="text-right px-2 py-1.5 font-medium">
                          Valor Op.
                        </th>
                        <th className="text-right px-2 py-1.5 font-medium">
                          R$ Vispe
                        </th>
                        <th className="text-right px-2 py-1.5 font-medium">
                          % Vispe
                        </th>
                        <th className="text-left px-2 py-1.5 font-medium">
                          Executivo
                        </th>
                        <th className="text-left px-2 py-1.5 font-medium">
                          UF
                        </th>
                        <th className="text-left px-2 py-1.5 font-medium">
                          Região
                        </th>
                        <th className="text-center px-2 py-1.5 font-medium">
                          Drive
                        </th>
                        <th className="text-center px-2 py-1.5 font-medium">
                          Contrato
                        </th>
                        <th className="text-left px-2 py-1.5 font-medium">
                          Conclusão
                        </th>
                        <th className="text-right px-2 py-1.5 font-medium">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((m) => {
                        const wa = whatsAppLinkFor(
                          m.contato_telefone,
                          `Olá ${m.contato_nome ?? ""}, aqui é da Vispe.`,
                        );
                        return (
                          <tr
                            key={m.id}
                            className="border-b border-zinc-900 hover:bg-zinc-900/40"
                          >
                            <td className="px-3 py-1.5">
                              <Link
                                to={`/equity-brain/crm/mandate/${m.id}`}
                                className="text-zinc-100 hover:text-[#D9F564] font-medium break-words"
                              >
                                {m.company_cnpj}
                              </Link>
                              {m.contato_nome && (
                                <div className="text-[10px] text-zinc-500 truncate break-words">
                                  {m.contato_nome}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-blue-300 break-words">
                              {m.comprador_nome || m.comprador_cnpj || (
                                <button
                                  onClick={() => setEditing(m)}
                                  className="text-zinc-600 hover:text-[#D9F564] italic"
                                >
                                  + match
                                </button>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-zinc-400 uppercase text-[10px]">
                              {DEAL_TYPE_LABEL[m.deal_type] ?? m.deal_type}
                            </td>
                            <td className="px-2 py-1.5">
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style={{
                                  background: `${OUTCOME_COLOR[m.outcome] ?? "#52525b"}22`,
                                  color: OUTCOME_COLOR[m.outcome] ?? "#a1a1aa",
                                }}
                              >
                                {OUTCOME_LABEL[m.outcome] ?? m.outcome ?? "—"}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-right text-emerald-300 tabular-nums">
                              {m.valor_operacao
                                ? brl(m.valor_operacao, { compact: true })
                                : "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right text-[#D9F564] tabular-nums">
                              {m.faturamento_vispe
                                ? brl(m.faturamento_vispe, { compact: true })
                                : "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right text-zinc-400 tabular-nums">
                              {m.commission_pct
                                ? `${Number(m.commission_pct).toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="px-2 py-1.5 text-zinc-300 break-words">
                              {m.responsavel_id
                                ? respMap.get(m.responsavel_id) ?? "—"
                                : "—"}
                            </td>
                            <td className="px-2 py-1.5 text-zinc-400">
                              {m.uf ?? "—"}
                            </td>
                            <td className="px-2 py-1.5 text-zinc-400 break-words">
                              {m.regiao ?? "—"}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {m.drive_url ? (
                                <a
                                  href={m.drive_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex text-[#D9F564] hover:opacity-80"
                                  title="Abrir Drive"
                                >
                                  <FolderOpen className="h-3.5 w-3.5" />
                                </a>
                              ) : (
                                <span className="text-zinc-700">—</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {m.contract_url ? (
                                <a
                                  href={m.contract_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex text-[#D9F564] hover:opacity-80"
                                  title="Abrir contrato"
                                >
                                  <FileSignature className="h-3.5 w-3.5" />
                                </a>
                              ) : (
                                <span className="text-zinc-700">—</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-zinc-400 whitespace-nowrap">
                              {m.data_fechamento
                                ? new Date(m.data_fechamento).toLocaleDateString(
                                    "pt-BR",
                                  )
                                : "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {wa && (
                                  <a
                                    href={wa}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="WhatsApp"
                                    className="text-emerald-400 hover:text-emerald-300 p-1"
                                  >
                                    <MessageCircle className="h-3 w-3" />
                                  </a>
                                )}
                                <button
                                  onClick={() => setEditing(m)}
                                  title="Edição rápida"
                                  className="text-zinc-400 hover:text-[#D9F564] p-1"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <Link
                                  to={`/equity-brain/crm/mandate/${m.id}`}
                                  title="Abrir ficha"
                                  className="text-zinc-400 hover:text-zinc-100 p-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
      </div>

      {editing && (
        <QuickEditPopover
          mandateId={editing.id}
          values={{
            valor_operacao: editing.valor_operacao,
            faturamento_vispe: editing.faturamento_vispe,
            commission_pct: editing.commission_pct,
            contato_nome: editing.contato_nome,
            contato_telefone: editing.contato_telefone,
            outcome: editing.outcome,
            pipeline_stage: editing.pipeline_stage,
            deal_type: editing.deal_type,
            uf: editing.uf,
            regiao: editing.regiao,
            responsavel_id: editing.responsavel_id,
            comprador_cnpj: editing.comprador_cnpj,
            comprador_nome: editing.comprador_nome,
            drive_url: editing.drive_url,
            contract_url: editing.contract_url,
            data_inicio: editing.data_inicio,
            data_fechamento: editing.data_fechamento,
            data_assinatura: editing.data_assinatura,
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
