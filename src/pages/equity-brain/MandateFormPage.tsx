import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMandate } from "@/hooks/useCrm";
import { useQueryClient } from "@tanstack/react-query";

type FormState = Record<string, string>;

const STATUS_OPTS = [
  ["vigente", "Vigente"],
  ["em_negociacao", "Em negociação"],
  ["vendemos", "Vendemos"],
  ["vendeu_sozinho", "Vendeu sozinho"],
  ["vencido", "Vencido"],
  ["cancelado", "Cancelado"],
];
const DEAL_TYPES = [
  ["sellside", "Sell-side"],
  ["buyside", "Buy-side"],
  ["spa", "SPA"],
  ["due_diligence", "Due Diligence"],
  ["cisao", "Cisão"],
  ["fusao", "Fusão"],
  ["nbo", "NBO"],
  ["match", "Match"],
];
const STAGES = [
  ["match", "Match"],
  ["nbo", "NBO"],
  ["due_diligence", "DD"],
  ["spa", "SPA"],
  ["closing", "Closing"],
  ["closed", "Closed"],
];
const OUTCOMES = [
  ["em_andamento", "Em andamento"],
  ["concluido", "Concluído"],
  ["cancelado", "Cancelado"],
  ["vencido", "Vencido"],
  ["vendeu_sozinho", "Vendeu sozinho"],
];

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR",
  "PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function Field({
  label, children, span = 1,
}: { label: string; children: React.ReactNode; span?: 1 | 2 | 3 }) {
  return (
    <div className={`col-span-${span}`}>
      <label className="block text-[10px] uppercase tracking-wide text-zinc-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:border-emerald-600 outline-none";

export default function MandateFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: mandate } = useMandate(id);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    company_cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    setor: "",
    uf: "",
    regiao: "",
    status: "vigente",
    deal_type: "sellside",
    pipeline_stage: "match",
    outcome: "em_andamento",
    exclusividade: "false",
    valor_pedido: "",
    valor_pretendido: "",
    ticket_alvo: "",
    valor_operacao: "",
    faturamento_vispe: "",
    commission_pct: "",
    data_inicio: "",
    data_assinatura: "",
    data_vencimento: "",
    data_fechamento: "",
    contato_nome: "",
    contato_telefone: "",
    contato_email: "",
    observacoes: "",
  });

  useEffect(() => {
    if (!mandate) return;
    setForm((f) => ({
      ...f,
      company_cnpj: mandate.company_cnpj ?? "",
      razao_social: mandate.razao_social ?? "",
      nome_fantasia: mandate.nome_fantasia ?? "",
      setor: mandate.setor ?? mandate.setor_ma ?? "",
      uf: mandate.uf ?? "",
      regiao: mandate.regiao ?? "",
      status: mandate.status ?? "vigente",
      deal_type: mandate.deal_type ?? "sellside",
      pipeline_stage: mandate.pipeline_stage ?? "match",
      outcome: mandate.outcome ?? "em_andamento",
      exclusividade: String(mandate.exclusividade ?? false),
      valor_pedido: mandate.valor_pedido?.toString() ?? "",
      valor_pretendido: mandate.valor_pretendido?.toString() ?? "",
      ticket_alvo: mandate.ticket_alvo?.toString() ?? "",
      valor_operacao: mandate.valor_operacao?.toString() ?? "",
      faturamento_vispe: mandate.faturamento_vispe?.toString() ?? "",
      commission_pct: mandate.commission_pct?.toString() ?? "",
      data_inicio: mandate.data_inicio ?? "",
      data_assinatura: mandate.data_assinatura ?? "",
      data_vencimento: mandate.data_vencimento ?? "",
      data_fechamento: mandate.data_fechamento ?? "",
      contato_nome: mandate.contato_nome ?? "",
      contato_telefone: mandate.contato_telefone ?? "",
      contato_email: mandate.contato_email ?? "",
      observacoes: mandate.observacoes ?? "",
    }));
  }, [mandate]);

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.company_cnpj.trim()) {
      toast.error("CNPJ é obrigatório");
      return;
    }
    setSaving(true);
    const payload: any = { ...form };
    if (isEdit) payload.id = id;
    const { data, error } = await (supabase as any).rpc("eb_upsert_mandate", { p: payload });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isEdit ? "Mandato atualizado" : "Mandato criado");
    qc.invalidateQueries({ queryKey: ["crm"] });
    navigate(`/equity-brain/crm/mandate/${data ?? id}`);
  };

  const previewName = useMemo(
    () => form.razao_social || form.nome_fantasia || form.company_cnpj || "Novo mandato",
    [form],
  );

  return (
    <div className="p-6 space-y-5 bg-zinc-950 min-h-full">
      <Link to="/equity-brain/crm" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-3 w-3" /> Voltar ao CRM
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{isEdit ? "Editar mandato" : "Novo mandato"}</h1>
          <p className="text-[11px] text-zinc-500 mt-1 break-words">{previewName}</p>
        </div>
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#D9F564] text-zinc-900 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" /> {saving ? "Salvando…" : "Salvar mandato"}
        </button>
      </header>

      {/* Empresa */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <h2 className="text-[10px] uppercase tracking-widest text-zinc-400">Empresa</h2>
        <div className="grid grid-cols-3 gap-3">
          <Field label="CNPJ *">
            <input className={inputCls} value={form.company_cnpj} onChange={set("company_cnpj")} placeholder="00.000.000/0000-00" />
          </Field>
          <Field label="Razão social">
            <input className={inputCls} value={form.razao_social} onChange={set("razao_social")} />
          </Field>
          <Field label="Nome fantasia">
            <input className={inputCls} value={form.nome_fantasia} onChange={set("nome_fantasia")} />
          </Field>
          <Field label="Setor">
            <input className={inputCls} value={form.setor} onChange={set("setor")} placeholder="Ex.: Tecnologia, Saúde…" />
          </Field>
          <Field label="UF">
            <select className={inputCls} value={form.uf} onChange={set("uf")}>
              <option value="">—</option>
              {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Região">
            <select className={inputCls} value={form.regiao} onChange={set("regiao")}>
              <option value="">—</option>
              <option value="sudeste">Sudeste</option>
              <option value="sul">Sul</option>
              <option value="centro-oeste">Centro-Oeste</option>
              <option value="nordeste">Nordeste</option>
              <option value="norte">Norte</option>
            </select>
          </Field>
        </div>
      </section>

      {/* Deal */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <h2 className="text-[10px] uppercase tracking-widest text-zinc-400">Deal</h2>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tipo de operação">
            <select className={inputCls} value={form.deal_type} onChange={set("deal_type")}>
              {DEAL_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Estágio do pipeline">
            <select className={inputCls} value={form.pipeline_stage} onChange={set("pipeline_stage")}>
              {STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Resultado">
            <select className={inputCls} value={form.outcome} onChange={set("outcome")}>
              {OUTCOMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Status do mandato">
            <select className={inputCls} value={form.status} onChange={set("status")}>
              {STATUS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Exclusividade">
            <select className={inputCls} value={form.exclusividade} onChange={set("exclusividade")}>
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </select>
          </Field>
        </div>
      </section>

      {/* Financeiro */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <h2 className="text-[10px] uppercase tracking-widest text-zinc-400">Financeiro</h2>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Valor pedido (R$)">
            <input type="number" className={inputCls} value={form.valor_pedido} onChange={set("valor_pedido")} />
          </Field>
          <Field label="Valor pretendido (R$)">
            <input type="number" className={inputCls} value={form.valor_pretendido} onChange={set("valor_pretendido")} />
          </Field>
          <Field label="Ticket alvo (R$)">
            <input type="number" className={inputCls} value={form.ticket_alvo} onChange={set("ticket_alvo")} />
          </Field>
          <Field label="Valor da operação (R$)">
            <input type="number" className={inputCls} value={form.valor_operacao} onChange={set("valor_operacao")} />
          </Field>
          <Field label="Faturamento Vispe (R$)">
            <input type="number" className={inputCls} value={form.faturamento_vispe} onChange={set("faturamento_vispe")} />
          </Field>
          <Field label="Comissão (%)">
            <input type="number" step="0.1" className={inputCls} value={form.commission_pct} onChange={set("commission_pct")} />
          </Field>
        </div>
      </section>

      {/* Datas */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <h2 className="text-[10px] uppercase tracking-widest text-zinc-400">Datas</h2>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Início">
            <input type="date" className={inputCls} value={form.data_inicio} onChange={set("data_inicio")} />
          </Field>
          <Field label="Assinatura">
            <input type="date" className={inputCls} value={form.data_assinatura} onChange={set("data_assinatura")} />
          </Field>
          <Field label="Vencimento">
            <input type="date" className={inputCls} value={form.data_vencimento} onChange={set("data_vencimento")} />
          </Field>
          <Field label="Fechamento">
            <input type="date" className={inputCls} value={form.data_fechamento} onChange={set("data_fechamento")} />
          </Field>
        </div>
      </section>

      {/* Contato */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <h2 className="text-[10px] uppercase tracking-widest text-zinc-400">Contato principal</h2>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Nome">
            <input className={inputCls} value={form.contato_nome} onChange={set("contato_nome")} />
          </Field>
          <Field label="Telefone / WhatsApp">
            <input className={inputCls} value={form.contato_telefone} onChange={set("contato_telefone")} />
          </Field>
          <Field label="E-mail">
            <input type="email" className={inputCls} value={form.contato_email} onChange={set("contato_email")} />
          </Field>
        </div>
      </section>

      {/* Observações */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <h2 className="text-[10px] uppercase tracking-widest text-zinc-400">Observações</h2>
        <textarea
          className={`${inputCls} min-h-[120px]`}
          value={form.observacoes}
          onChange={set("observacoes")}
          placeholder="Notas internas, contexto do deal, próximos passos…"
        />
      </section>

      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-[#D9F564] text-zinc-900 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" /> {saving ? "Salvando…" : "Salvar mandato"}
        </button>
      </div>
    </div>
  );
}
