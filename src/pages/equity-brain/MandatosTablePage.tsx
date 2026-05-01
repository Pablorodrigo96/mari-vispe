import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Download, Search } from "lucide-react";
import { toast } from "sonner";

type Row = Record<string, any>;

const COLUMNS: { key: string; label: string; type: "text" | "number" | "date" | "select"; options?: string[]; width?: string }[] = [
  { key: "codename",          label: "Codename",      type: "text", width: "w-32" },
  { key: "razao_social",      label: "Razão social",  type: "text", width: "w-56" },
  { key: "company_cnpj",      label: "CNPJ",          type: "text", width: "w-40" },
  { key: "deal_type",         label: "Tipo",          type: "select", options: ["sellside","buyside"], width: "w-28" },
  { key: "deal_kind",         label: "Origem",        type: "select", options: ["mandato_assinado","buyer_mandate","lead","prospect"], width: "w-40" },
  { key: "deal_phase",        label: "Fase",          type: "select", options: ["prospect","qualificacao","mandato","match","nbo","dd","sign","concluido"], width: "w-32" },
  { key: "outcome",           label: "Outcome",       type: "select", options: ["em_andamento","concluido","cancelado"], width: "w-36" },
  { key: "status",            label: "Status",        type: "select", options: ["vigente","concluido","cancelado","pausado"], width: "w-28" },
  { key: "valor_pedido",      label: "Valor pedido",  type: "number", width: "w-32" },
  { key: "valor_operacao",    label: "Valor operação",type: "number", width: "w-32" },
  { key: "faturamento_vispe", label: "Fee Vispe",     type: "number", width: "w-28" },
  { key: "comissao_pct",      label: "Comissão %",    type: "number", width: "w-24" },
  { key: "data_inicio",       label: "Início",        type: "date",   width: "w-32" },
  { key: "data_assinatura",   label: "Assinatura",    type: "date",   width: "w-32" },
  { key: "data_fechamento",   label: "Fechamento",    type: "date",   width: "w-32" },
  { key: "uf",                label: "UF",            type: "text",   width: "w-16" },
  { key: "setor",             label: "Setor",         type: "text",   width: "w-40" },
  { key: "comprador_nome",    label: "Comprador",     type: "text",   width: "w-48" },
  { key: "contato_nome",      label: "Contato",       type: "text",   width: "w-40" },
  { key: "contato_telefone",  label: "Telefone",      type: "text",   width: "w-36" },
];

const NON_EDITABLE = new Set(["codename", "razao_social", "company_cnpj"]);

export default function MandatosTablePage() {
  const [params] = useSearchParams();
  const initialEmpty = params.get("empty"); // ex.: ?empty=valor_operacao
  const [search, setSearch] = useState("");
  const [filterEmpty, setFilterEmpty] = useState<string | null>(initialEmpty);
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["mandatos-table"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_v_mandates_full" as any)
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: string }) => {
      const { error } = await supabase.rpc("update_mandate_field" as any, {
        p_mandate_id: id, p_field: field, p_value: value,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["mandatos-table"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const filtered = useMemo(() => {
    let out = rows;
    if (filterEmpty) out = out.filter((r) => r[filterEmpty] === null || r[filterEmpty] === "" || r[filterEmpty] === undefined);
    if (search.trim()) {
      const s = search.toLowerCase();
      out = out.filter((r) =>
        [r.codename, r.razao_social, r.company_cnpj, r.contato_nome, r.comprador_nome]
          .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(s))
      );
    }
    return out;
  }, [rows, search, filterEmpty]);

  const exportCsv = () => {
    const header = COLUMNS.map((c) => c.label).join(",");
    const lines = filtered.map((r) => COLUMNS.map((c) => `"${String(r[c.key] ?? "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mandatos.csv"; a.click();
  };

  return (
    <div className="p-6 bg-[#0A0A0A] min-h-screen text-[#FAFAF7]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mandatos · Tabela mestre</h1>
          <p className="text-xs text-[#A8A8A3] mt-1">
            Toda mudança aqui aparece nos dashboards no próximo refresh (≤ 60s). Clique em qualquer célula para editar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/equity-brain/admin/dashboard-coverage">
            <Button variant="outline" className="bg-transparent border-[#2A2A2A]">Cobertura dashboards</Button>
          </Link>
          <Button variant="outline" className="bg-transparent border-[#2A2A2A]" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Link to="/equity-brain/crm/mandate/new">
            <Button className="bg-[#D9F564] text-[#0A0A0A] hover:bg-[#D9F564]/90">
              <Plus className="h-4 w-4 mr-1" /> Novo mandato
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-[#A8A8A3]" />
          <Input
            placeholder="Buscar codename, razão social, CNPJ…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-80 bg-[#141414] border-[#2A2A2A]"
          />
        </div>
        <select
          value={filterEmpty ?? ""} onChange={(e) => setFilterEmpty(e.target.value || null)}
          className="bg-[#141414] border border-[#2A2A2A] rounded px-2 py-2 text-xs"
        >
          <option value="">Todos os mandatos</option>
          <option value="valor_operacao">Sem valor_operacao (Dashboard Executivo)</option>
          <option value="faturamento_vispe">Sem fee Vispe</option>
          <option value="responsavel_id">Sem responsável</option>
          <option value="data_assinatura">Sem data de assinatura</option>
          <option value="deal_phase">Sem fase</option>
          <option value="outcome">Sem outcome</option>
          <option value="setor">Sem setor</option>
          <option value="uf">Sem UF</option>
        </select>
        <span className="text-xs text-[#A8A8A3]">{filtered.length} de {rows.length} mandatos</span>
      </div>

      <div className="overflow-auto border border-[#2A2A2A] rounded-lg">
        <table className="text-xs w-full border-collapse">
          <thead className="sticky top-0 bg-[#141414] z-10">
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} className={`text-left px-2 py-2 border-b border-[#2A2A2A] font-semibold text-[#A8A8A3] uppercase tracking-wider ${c.width ?? ""}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={COLUMNS.length} className="p-4 text-center text-[#A8A8A3]">Carregando…</td></tr>
            )}
            {!isLoading && filtered.map((r) => (
              <tr key={r.id} className="hover:bg-[#141414] border-b border-[#1A1A1A]">
                {COLUMNS.map((c) => (
                  <Cell key={c.key} row={r} col={c} onSave={(value) => update.mutate({ id: r.id, field: c.key, value })} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ row, col, onSave }: { row: Row; col: any; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(row[col.key] ?? "");
  const readonly = NON_EDITABLE.has(col.key);

  if (readonly) {
    return <td className="px-2 py-1.5 text-[#A8A8A3]">{row[col.key] ?? "—"}</td>;
  }

  if (!editing) {
    const display = row[col.key];
    return (
      <td
        className="px-2 py-1.5 cursor-pointer hover:bg-[#1F1F1F]"
        onClick={() => { setVal(row[col.key] ?? ""); setEditing(true); }}
      >
        {display === null || display === undefined || display === "" ? (
          <span className="text-[#5A5A55] italic">vazio</span>
        ) : col.type === "number" ? (
          <span className="font-mono">{Number(display).toLocaleString("pt-BR")}</span>
        ) : (
          String(display)
        )}
      </td>
    );
  }

  const commit = () => {
    setEditing(false);
    if (String(val) !== String(row[col.key] ?? "")) onSave(String(val));
  };

  return (
    <td className="px-1 py-0.5">
      {col.type === "select" ? (
        <select
          autoFocus value={val} onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          className="w-full bg-[#1A1A1A] border border-[#D9F564]/50 rounded px-1 py-1 text-xs"
        >
          <option value="">—</option>
          {col.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          autoFocus type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
          value={val} onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          className="w-full bg-[#1A1A1A] border border-[#D9F564]/50 rounded px-1 py-1 text-xs"
        />
      )}
    </td>
  );
}
