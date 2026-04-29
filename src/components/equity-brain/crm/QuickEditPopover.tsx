import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Check, ExternalLink, FolderOpen, FileSignature } from "lucide-react";
import {
  brl,
  OUTCOME_OPTIONS,
  OUTCOME_LABEL,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABEL,
  DEAL_TYPE_LABEL,
  ALL_UFS,
  REGIAO_BY_UF,
} from "@/lib/dealFormatters";

type Props = {
  mandateId: string;
  values: {
    valor_operacao: number | null;
    faturamento_vispe: number | null;
    commission_pct?: number | null;
    contato_nome: string | null;
    contato_telefone?: string | null;
    outcome?: string | null;
    pipeline_stage?: string | null;
    deal_type?: string | null;
    uf?: string | null;
    regiao?: string | null;
    responsavel_id?: string | null;
    comprador_cnpj?: string | null;
    comprador_nome?: string | null;
    drive_url?: string | null;
    contract_url?: string | null;
    data_inicio?: string | null;
    data_fechamento?: string | null;
    data_assinatura_contrato?: string | null;
  };
  onClose: () => void;
};

const DEAL_TYPES = ["sellside", "buyside", "spa", "due_diligence", "fusao", "cisao"] as const;

export function QuickEditPopover({ mandateId, values, onClose }: Props) {
  const qc = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");
      return (data ?? []) as { user_id: string; full_name: string | null }[];
    },
  });

  const [form, setForm] = useState({
    valor_operacao: values.valor_operacao?.toString() ?? "",
    faturamento_vispe: values.faturamento_vispe?.toString() ?? "",
    commission_pct: values.commission_pct?.toString() ?? "",
    contato_nome: values.contato_nome ?? "",
    contato_telefone: values.contato_telefone ?? "",
    outcome: values.outcome ?? "",
    pipeline_stage: values.pipeline_stage ?? "",
    deal_type: values.deal_type ?? "",
    uf: values.uf ?? "",
    regiao: values.regiao ?? "",
    responsavel_id: values.responsavel_id ?? "",
    comprador_cnpj: values.comprador_cnpj ?? "",
    comprador_nome: values.comprador_nome ?? "",
    drive_url: values.drive_url ?? "",
    contract_url: values.contract_url ?? "",
    data_inicio: values.data_inicio?.slice(0, 10) ?? "",
    data_fechamento: values.data_fechamento?.slice(0, 10) ?? "",
    data_assinatura_contrato: values.data_assinatura_contrato?.slice(0, 10) ?? "",
  });

  // Auto-fill regiao from UF
  useEffect(() => {
    if (form.uf && !form.regiao) {
      const r = REGIAO_BY_UF[form.uf];
      if (r) setForm((f) => ({ ...f, regiao: r }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.uf]);

  const save = useMutation({
    mutationFn: async () => {
      const patch: any = {};
      if (form.valor_operacao !== "") patch.valor_operacao = Number(form.valor_operacao);
      if (form.faturamento_vispe !== "") patch.faturamento_vispe = Number(form.faturamento_vispe);
      if (form.commission_pct !== "") patch.commission_pct = Number(form.commission_pct);
      if (form.contato_nome) patch.contato_nome = form.contato_nome;
      if (form.contato_telefone) patch.contato_telefone = form.contato_telefone;
      if (form.outcome) patch.outcome = form.outcome;
      if (form.pipeline_stage) patch.pipeline_stage = form.pipeline_stage;
      if (form.deal_type) patch.deal_type = form.deal_type;
      if (form.uf) patch.uf = form.uf;
      if (form.regiao) patch.regiao = form.regiao;
      if (form.responsavel_id) patch.responsavel_id = form.responsavel_id;
      if (form.comprador_cnpj) patch.comprador_cnpj = form.comprador_cnpj.replace(/\D/g, "");
      if (form.comprador_nome) patch.comprador_nome = form.comprador_nome;
      if (form.drive_url) patch.drive_url = form.drive_url;
      if (form.contract_url) patch.contract_url = form.contract_url;
      if (form.data_inicio) patch.data_inicio = form.data_inicio;
      if (form.data_fechamento) patch.data_fechamento = form.data_fechamento;
      if (form.data_assinatura_contrato) patch.data_assinatura_contrato = form.data_assinatura_contrato;

      const { error } = await supabase.from("eb_mandates" as any).update(patch).eq("id", mandateId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mandato atualizado");
      qc.invalidateQueries({ queryKey: ["pipeline-kanban"] });
      qc.invalidateQueries({ queryKey: ["crm"] });
      qc.invalidateQueries({ queryKey: ["mandates-monday"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  const set = (k: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const inputCls =
    "w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-[11px] text-zinc-100 focus:border-[#D9F564] outline-none";

  const sectionCls = "border border-zinc-800 rounded-md p-3 space-y-2 bg-zinc-950/40";
  const labelCls = "block text-[9px] uppercase tracking-wider text-zinc-500 mb-1";

  const commissaoPreview =
    form.valor_operacao && form.commission_pct
      ? Number(form.valor_operacao) * (Number(form.commission_pct) / 100)
      : null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,95vw)] max-h-[92vh] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 sticky top-0 bg-zinc-900 z-10 -mx-4 px-4">
          <div className="text-sm font-semibold text-zinc-100">Edição rápida do mandato</div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Identificação */}
        <div className={sectionCls}>
          <div className="text-[10px] uppercase text-[#D9F564] tracking-wider font-bold">Identificação</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Comprador (CNPJ)</label>
              <input className={inputCls} value={form.comprador_cnpj} onChange={set("comprador_cnpj")} placeholder="apenas dígitos" />
            </div>
            <div>
              <label className={labelCls}>Comprador (nome)</label>
              <input className={inputCls} value={form.comprador_nome} onChange={set("comprador_nome")} placeholder="Razão social ou apelido" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Executivo Responsável</label>
              <select className={inputCls} value={form.responsavel_id} onChange={set("responsavel_id")}>
                <option value="">— sem responsável —</option>
                {profiles.map((p) => (
                  <option key={p.user_id} value={p.user_id}>{p.full_name || p.user_id.slice(0, 6)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Localização */}
        <div className={sectionCls}>
          <div className="text-[10px] uppercase text-[#D9F564] tracking-wider font-bold">Localização</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Estado (UF)</label>
              <select className={inputCls} value={form.uf} onChange={set("uf")}>
                <option value="">—</option>
                {ALL_UFS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Região</label>
              <input className={inputCls} value={form.regiao} onChange={set("regiao")} placeholder="Ex.: Sudeste" />
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div className={sectionCls}>
          <div className="text-[10px] uppercase text-[#D9F564] tracking-wider font-bold">Pipeline</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Tipo de operação</label>
              <select className={inputCls} value={form.deal_type} onChange={set("deal_type")}>
                <option value="">—</option>
                {DEAL_TYPES.map((d) => (
                  <option key={d} value={d}>{DEAL_TYPE_LABEL[d] ?? d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fase do processo</label>
              <select className={inputCls} value={form.pipeline_stage} onChange={set("pipeline_stage")}>
                <option value="">—</option>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>{PIPELINE_STAGE_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status do projeto</label>
              <select className={inputCls} value={form.outcome} onChange={set("outcome")}>
                <option value="">—</option>
                {OUTCOME_OPTIONS.map((o) => (
                  <option key={o} value={o}>{OUTCOME_LABEL[o] || o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Data de início</label>
              <input type="date" className={inputCls} value={form.data_inicio} onChange={set("data_inicio")} />
            </div>
            <div>
              <label className={labelCls}>Data de conclusão</label>
              <input type="date" className={inputCls} value={form.data_fechamento} onChange={set("data_fechamento")} />
            </div>
            <div>
              <label className={labelCls}>Data assinatura contrato</label>
              <input type="date" className={inputCls} value={form.data_assinatura_contrato} onChange={set("data_assinatura_contrato")} />
            </div>
          </div>
        </div>

        {/* Financeiro */}
        <div className={sectionCls}>
          <div className="text-[10px] uppercase text-[#D9F564] tracking-wider font-bold">Financeiro</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Valor da operação (R$)</label>
              <input type="number" className={inputCls} value={form.valor_operacao} onChange={set("valor_operacao")} />
            </div>
            <div>
              <label className={labelCls}>R$ Vispe (faturamento)</label>
              <input type="number" className={inputCls} value={form.faturamento_vispe} onChange={set("faturamento_vispe")} />
            </div>
            <div>
              <label className={labelCls}>% Vispe (comissão)</label>
              <input type="number" step="0.1" className={inputCls} value={form.commission_pct} onChange={set("commission_pct")} />
            </div>
            <div>
              <label className={labelCls}>Comissão estimada</label>
              <div className="px-2 py-1.5 text-[11px] text-emerald-300 tabular-nums break-words border border-zinc-800 rounded bg-zinc-950">
                {commissaoPreview ? brl(commissaoPreview, { compact: true }) : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Documentos / Links */}
        <div className={sectionCls}>
          <div className="text-[10px] uppercase text-[#D9F564] tracking-wider font-bold">Documentos & Links</div>
          <div className="space-y-2">
            <div>
              <label className={labelCls}>Drive do projeto</label>
              <div className="flex gap-1">
                <input className={inputCls} value={form.drive_url} onChange={set("drive_url")} placeholder="https://drive.google.com/..." />
                {form.drive_url && (
                  <a href={form.drive_url} target="_blank" rel="noopener noreferrer"
                     className="text-[11px] inline-flex items-center gap-1 px-2 rounded border border-zinc-800 text-zinc-300 hover:text-[#D9F564] bg-transparent">
                    <FolderOpen className="h-3 w-3" /> Abrir
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className={labelCls}>Contrato (URL)</label>
              <div className="flex gap-1">
                <input className={inputCls} value={form.contract_url} onChange={set("contract_url")} placeholder="https://..." />
                {form.contract_url && (
                  <a href={form.contract_url} target="_blank" rel="noopener noreferrer"
                     className="text-[11px] inline-flex items-center gap-1 px-2 rounded border border-zinc-800 text-zinc-300 hover:text-[#D9F564] bg-transparent">
                    <FileSignature className="h-3 w-3" /> Abrir
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className={sectionCls}>
          <div className="text-[10px] uppercase text-[#D9F564] tracking-wider font-bold">Contato</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Nome do contato</label>
              <input className={inputCls} value={form.contato_nome} onChange={set("contato_nome")} />
            </div>
            <div>
              <label className={labelCls}>Telefone / WhatsApp</label>
              <input className={inputCls} value={form.contato_telefone} onChange={set("contato_telefone")} placeholder="(11) 99999-9999" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800 sticky bottom-0 bg-zinc-900 -mx-4 px-4 -mb-4 pb-3">
          <button
            onClick={onClose}
            className="text-[11px] px-3 py-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200 bg-transparent"
          >
            Cancelar
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="text-[11px] px-3 py-1.5 rounded bg-[#D9F564] text-zinc-900 font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Check className="h-3 w-3" /> {save.isPending ? "Salvando…" : "Salvar tudo"}
          </button>
        </div>
      </div>
    </>
  );
}
