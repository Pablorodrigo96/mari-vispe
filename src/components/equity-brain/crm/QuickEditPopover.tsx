import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Check } from "lucide-react";
import { brl, OUTCOME_OPTIONS, OUTCOME_LABEL } from "@/lib/dealFormatters";

type Props = {
  mandateId: string;
  values: {
    valor_operacao: number | null;
    faturamento_vispe: number | null;
    commission_pct?: number | null;
    contato_nome: string | null;
    contato_telefone?: string | null;
    outcome?: string | null;
  };
  onClose: () => void;
};

export function QuickEditPopover({ mandateId, values, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    valor_operacao: values.valor_operacao?.toString() ?? "",
    faturamento_vispe: values.faturamento_vispe?.toString() ?? "",
    commission_pct: values.commission_pct?.toString() ?? "",
    contato_nome: values.contato_nome ?? "",
    contato_telefone: values.contato_telefone ?? "",
    outcome: values.outcome ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const patch: any = {};
      if (form.valor_operacao !== "") patch.valor_operacao = Number(form.valor_operacao);
      if (form.faturamento_vispe !== "") patch.faturamento_vispe = Number(form.faturamento_vispe);
      if (form.commission_pct !== "") patch.commission_pct = Number(form.commission_pct);
      if (form.contato_nome) patch.contato_nome = form.contato_nome;
      if (form.contato_telefone) patch.contato_telefone = form.contato_telefone;
      if (form.outcome) patch.outcome = form.outcome;
      const { error } = await supabase.from("eb_mandates" as any).update(patch).eq("id", mandateId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mandato atualizado");
      qc.invalidateQueries({ queryKey: ["pipeline-kanban"] });
      qc.invalidateQueries({ queryKey: ["crm"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  const set = (k: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const inputCls =
    "w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-100 focus:border-emerald-600 outline-none";

  const commissaoPreview =
    form.valor_operacao && form.commission_pct
      ? Number(form.valor_operacao) * (Number(form.commission_pct) / 100)
      : null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(440px,92vw)] rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="text-xs font-semibold text-zinc-100">Edição rápida</div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] uppercase text-zinc-500 mb-1">Valor da operação (R$)</label>
            <input type="number" autoFocus className={inputCls} value={form.valor_operacao} onChange={set("valor_operacao")} />
          </div>
          <div>
            <label className="block text-[9px] uppercase text-zinc-500 mb-1">Faturamento Vispe (R$)</label>
            <input type="number" className={inputCls} value={form.faturamento_vispe} onChange={set("faturamento_vispe")} />
          </div>
          <div>
            <label className="block text-[9px] uppercase text-zinc-500 mb-1">Comissão (%)</label>
            <input type="number" step="0.1" className={inputCls} value={form.commission_pct} onChange={set("commission_pct")} />
          </div>
          <div>
            <label className="block text-[9px] uppercase text-zinc-500 mb-1">Comissão estimada</label>
            <div className="px-2 py-1 text-[11px] text-emerald-300 tabular-nums break-words">
              {commissaoPreview ? brl(commissaoPreview, { compact: true }) : "—"}
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-[9px] uppercase text-zinc-500 mb-1">Status do mandato</label>
            <select
              className={inputCls}
              value={form.outcome}
              onChange={set("outcome")}
            >
              <option value="">— manter atual —</option>
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o} value={o}>{OUTCOME_LABEL[o] || o}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[9px] uppercase text-zinc-500 mb-1">Contato</label>
            <input className={inputCls} value={form.contato_nome} onChange={set("contato_nome")} placeholder="Nome do contato" />
          </div>
          <div className="col-span-2">
            <label className="block text-[9px] uppercase text-zinc-500 mb-1">Telefone / WhatsApp</label>
            <input className={inputCls} value={form.contato_telefone} onChange={set("contato_telefone")} placeholder="(11) 99999-9999" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
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
            <Check className="h-3 w-3" /> {save.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </>
  );
}
